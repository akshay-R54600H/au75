"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/lib/context/AppContext";
import type { ClassSession, PredictionState } from "@/lib/models/types";
import { todayISO, fmtLong, fmtTime, fmtRange } from "@/lib/calculations/dates";
import PredictionToggle from "@/components/ui/PredictionToggle";
import WeekGrid from "./WeekGrid";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");

const DOT: Record<PredictionState, string> = { present: "bg-success", absent: "bg-danger", ignore: "bg-faint" };

export default function CalendarView() {
  const { state, setPredictions } = useApp();
  const today = todayISO();
  const [view, setView] = useState<"month" | "week">("month");
  const [y, setY] = useState(() => new Date().getFullYear());
  const [m, setM] = useState(() => new Date().getMonth());
  const [selected, setSelected] = useState<string | null>(today);

  const byDate = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    for (const s of state.sessions) {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    }
    map.forEach((arr) => arr.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")));
    return map;
  }, [state.sessions]);

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDay = new Date(y, m, 1).getDay();
  const dateStr = (d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

  function shift(delta: number) {
    const d = new Date(y, m + delta, 1);
    setY(d.getFullYear());
    setM(d.getMonth());
  }

  const selectedSessions = selected ? byDate.get(selected) ?? [] : [];
  const selectedFuture = selectedSessions.filter((s) => s.isFuture);

  function setDay(stateVal: PredictionState) {
    const entries: Record<string, PredictionState> = {};
    for (const s of selectedFuture) entries[s.id] = stateVal;
    setPredictions(entries);
  }

  const navBtn = "flex h-9 w-9 items-center justify-center rounded-full border-2 border-line-strong text-ink hover:border-ink/50";
  const tab = (v: typeof view) =>
    `rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${view === v ? "bg-ink text-paper" : "text-muted hover:text-ink"}`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className={navBtn} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <div className="min-w-[150px] text-center font-hand text-2xl font-bold text-ink">{MONTHS[m]} {y}</div>
          <button onClick={() => shift(1)} className={navBtn} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
        <div className="flex rounded-full border-2 border-line-strong p-0.5">
          <button className={tab("month")} onClick={() => setView("month")}>Month</button>
          <button className={tab("week")} onClick={() => setView("week")}>Week</button>
        </div>
      </div>

      {view === "week" ? (
        <WeekGrid sessions={state.sessions} />
      ) : (
        <>
          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1 text-center text-[11px] font-bold uppercase text-faint">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const ds = dateStr(i + 1);
              const sessions = byDate.get(ds) ?? [];
              const isToday = ds === today;
              const isSel = ds === selected;
              const past = ds < today;
              return (
                <button
                  key={ds}
                  onClick={() => setSelected(isSel ? null : ds)}
                  aria-pressed={isSel}
                  aria-label={`${i + 1} ${MONTHS[m]}, ${sessions.length} classes`}
                  className={`flex min-h-[56px] flex-col items-center rounded-xl border-2 p-1 transition-colors sm:min-h-[64px] ${
                    isSel ? "border-accent bg-accent-soft/60" : isToday ? "border-ink/40 bg-surface" : "border-line bg-surface hover:border-line-strong"
                  } ${past ? "opacity-60" : ""}`}
                >
                  <span className={`text-sm ${isToday ? "font-hand text-lg font-bold text-accent-deep" : "font-semibold text-ink"}`}>{i + 1}</span>
                  <span className="mt-auto flex flex-wrap justify-center gap-0.5">
                    {sessions.slice(0, 4).map((s) => (
                      <span
                        key={s.id}
                        className={`h-1.5 w-1.5 rounded-full ${past ? "bg-line-strong" : DOT[state.predictions[s.id] ?? "present"]}`}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted">
            <Legend cls="bg-success" label="Attending" />
            <Legend cls="bg-danger" label="Skipping" />
            <Legend cls="bg-faint" label="Ignored" />
            <Legend cls="bg-line-strong" label="Past" />
          </div>

          {selected && (
            <div className="card mt-5 p-5 animate-fade-up">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-hand text-2xl font-bold text-ink">{fmtLong(selected)}</div>
                {selectedFuture.length > 1 && (
                  <div className="flex gap-1.5">
                    <button onClick={() => setDay("present")} className="rounded-full border-2 border-success px-3 py-1 text-xs font-bold text-success hover:bg-success-soft">Attend all</button>
                    <button onClick={() => setDay("absent")} className="rounded-full border-2 border-danger px-3 py-1 text-xs font-bold text-danger hover:bg-danger-soft">Skip the day</button>
                  </div>
                )}
              </div>

              {selectedSessions.length === 0 && <p className="mt-2 text-sm text-muted">No classes.</p>}

              <ul className="mt-2 divide-y divide-line">
                {selectedSessions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <Link href={`/subjects?subject=${encodeURIComponent(s.subjectId)}`} className="block truncate font-bold text-ink hover:underline">
                        {s.subjectName}
                      </Link>
                      <div className="text-xs text-muted">
                        {fmtRange(s.startTime, s.endTime)}{s.room ? ` · ${s.room}` : ""}
                      </div>
                    </div>
                    {s.isFuture ? (
                      <PredictionToggle
                        size="sm"
                        value={state.predictions[s.id] ?? "present"}
                        onChange={(v) => setPredictions({ [s.id]: v })}
                      />
                    ) : (
                      <span className="text-xs text-faint">{s.startTime ? fmtTime(s.startTime) : ""} · past</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5"><span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />{label}</span>
  );
}
