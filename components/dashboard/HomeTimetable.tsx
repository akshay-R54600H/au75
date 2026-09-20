"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { useApp } from "@/lib/context/AppContext";
import type { ClassSession, Subject } from "@/lib/models/types";
import { calcPercentage } from "@/lib/calculations/engine";
import { subjectVerdict } from "@/lib/calculations/summary";
import { todayISO, fmtDay, fmtRange, minutes } from "@/lib/calculations/dates";
import CircularProgress from "@/components/ui/CircularProgress";
import PredictionToggle from "@/components/ui/PredictionToggle";

const LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TONE = { safe: "text-success", warning: "text-warn", danger: "text-danger" } as const;

function mondayISO(offsetWeeks: number, from = new Date()): string {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offsetWeeks * 7);
  return todayISO(d);
}

function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

export default function HomeTimetable() {
  const { state } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const today = todayISO(now);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const week = useMemo(() => {
    const mon = mondayISO(weekOffset);
    const six = Array.from({ length: 6 }, (_, i) => addDaysISO(mon, i));
    const hasSat = state.sessions.some((s) => s.date === six[5]);
    return six.slice(0, hasSat ? 6 : 5);
  }, [weekOffset, state.sessions]);

  const weekKey = week.join();
  const [selected, setSelected] = useState(() => (week.includes(today) ? today : week[0]));

  useEffect(() => {
    setSelected(week.includes(today) ? today : week[0]);
    // weekKey is the stable identity of the visible days
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, today]);

  const sessions = useMemo(
    () =>
      state.sessions
        .filter((s) => s.date === selected)
        .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")),
    [state.sessions, selected]
  );

  const subjects = useMemo(() => new Map(state.subjects.map((s) => [s.id, s])), [state.subjects]);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const selectedLabel = LABELS[week.indexOf(selected)] ?? fmtDay(selected);
  const touchX = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.changedTouches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 48) return;
    const i = week.indexOf(selected);
    const next = week[i + (dx < 0 ? 1 : -1)];
    if (next) setSelected(next);
  }

  return (
    <section aria-labelledby="timetable-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="timetable-heading" className="font-hand text-2xl font-bold text-ink">
          Timetable
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWeekOffset((o) => o - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-line-strong text-ink hover:border-ink/50"
            aria-label="Previous week"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[7.5rem] text-center text-xs font-semibold text-muted">
            {fmtDay(week[0])} – {fmtDay(week[week.length - 1])}
          </span>
          <button
            type="button"
            onClick={() => setWeekOffset((o) => o + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-line-strong text-ink hover:border-ink/50"
            aria-label="Next week"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
        {week.map((d, i) => {
          const on = d === selected;
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelected(d)}
              aria-pressed={on}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                on ? "bg-ink text-paper" : "border-2 border-line-strong text-muted hover:border-ink/40 hover:text-ink"
              }`}
            >
              {LABELS[i]}
              {isToday && !on && <span className="ml-1 text-[10px] font-semibold normal-case tracking-normal">today</span>}
            </button>
          );
        })}
      </div>

      <div
        key={selected}
        className="animate-fade-up"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {sessions.length === 0 ? (
          <div className="card px-4 py-8 text-center text-sm text-muted">
            No classes on {selectedLabel}.
            <Link href="/calendar" className="mt-1 block font-semibold text-accent-deep">
              Open calendar →
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.map((s) => (
              <li key={s.id}>
                <ClassCard
                  session={s}
                  subject={subjects.get(s.subjectId)}
                  nowMin={nowMin}
                  isToday={selected === today}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ClassCard({
  session,
  subject,
  nowMin,
  isToday,
}: {
  session: ClassSession;
  subject?: Subject;
  nowMin: number;
  isToday: boolean;
}) {
  const { state, setPrediction } = useApp();
  const { attendanceTarget, requirement, showDecimals } = state.settings;
  const attended = subject?.attended ?? 0;
  const total = subject?.total ?? 0;
  const pct = calcPercentage(attended, total);
  const v = subjectVerdict(attended, total, attendanceTarget, requirement);
  const ongoing =
    isToday &&
    !!session.startTime &&
    !!session.endTime &&
    nowMin >= minutes(session.startTime) &&
    nowMin <= minutes(session.endTime);
  const done = isToday && !!session.endTime && nowMin > minutes(session.endTime);
  const faculty = session.faculty ?? subject?.faculty;
  const room = session.room ?? subject?.room;
  const pred = state.predictions[session.id] ?? "present";

  return (
    <article
      className={`card p-4 ${ongoing ? "border-accent bg-accent-soft/50 shadow-[3px_3px_0_rgb(var(--accent)/0.35)]" : done ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Link
          href={`/subjects?subject=${encodeURIComponent(session.subjectId)}`}
          className="min-w-0 flex-1"
          aria-label={`${session.subjectName}: ${v.headline}`}
        >
          <div className="flex items-center gap-2">
            <h3 className="truncate font-bold text-ink">{session.subjectName}</h3>
            {ongoing && (
              <span className="rounded-full bg-marker px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Now
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-faint">
            {session.subjectCode}
            {subject?.section ? ` · ${subject.section}` : ""}
          </div>
          <div className="mt-2 flex flex-col gap-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={12} />
              {fmtRange(session.startTime, session.endTime) || "Time TBA"}
            </span>
            {room && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} />
                {room}
              </span>
            )}
            {faculty && <span>Faculty: {faculty}</span>}
            <span className="font-semibold text-ink">
              Classes attended: {attended}/{total}
            </span>
          </div>
          <p className={`mt-2 text-sm font-bold ${TONE[v.status]}`}>{v.headline}</p>
        </Link>
        <CircularProgress value={pct} size={80} target={attendanceTarget} decimals={showDecimals} />
      </div>
      {session.isFuture && !done && (
        <div className="mt-3 border-t border-line pt-3">
          <PredictionToggle size="sm" value={pred} onChange={(next) => setPrediction(session.id, next)} />
        </div>
      )}
    </article>
  );
}
