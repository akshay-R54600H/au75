"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClassSession } from "@/lib/models/types";
import { todayISO, fmtDay, fmtTime } from "@/lib/calculations/dates";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Week timetable: rows = periods, columns = Mon–Sat. */
export default function WeekGrid({ sessions }: { sessions: ClassSession[] }) {
  const [offset, setOffset] = useState(0);
  const today = todayISO();

  const week = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7); // Monday
    return Array.from({ length: 6 }, (_, i) => {
      const x = new Date(d);
      x.setDate(d.getDate() + i);
      return todayISO(x);
    });
  }, [offset]);

  const inWeek = sessions.filter((s) => week.includes(s.date));
  const periods = Array.from(new Set(inWeek.map((s) => s.session))).sort((a, b) => a - b);
  const timeOf = new Map(inWeek.map((s) => [s.session, s.startTime]));
  const cell = (date: string, period: number) => inWeek.find((s) => s.date === date && s.session === period);
  const hasSat = inWeek.some((s) => s.date === week[5]);
  const cols = hasSat ? 6 : 5;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setOffset((o) => o - 1)} className="rounded-full p-1.5 hover:bg-ink/5" aria-label="Previous week"><ChevronLeft size={18} /></button>
        <span className="text-sm font-semibold text-muted">{fmtDay(week[0])} – {fmtDay(week[cols - 1])}</span>
        <button onClick={() => setOffset((o) => o + 1)} className="rounded-full p-1.5 hover:bg-ink/5" aria-label="Next week"><ChevronRight size={18} /></button>
      </div>

      {periods.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">No classes this week.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="w-14" />
                {week.slice(0, cols).map((d, i) => (
                  <th key={d} className={`rounded-lg py-1.5 font-bold ${d === today ? "bg-accent-soft text-accent-deep" : "text-muted"}`}>
                    {DAYS[i]} <span className="font-normal opacity-70">{d.slice(8)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p}>
                  <td className="whitespace-nowrap pr-1 text-right text-[10px] font-semibold text-faint">{fmtTime(timeOf.get(p))}</td>
                  {week.slice(0, cols).map((d) => {
                    const s = cell(d, p);
                    return (
                      <td key={d} className={`h-14 rounded-lg border-2 p-1 align-top ${s ? "border-ink/15 bg-surface" : "border-transparent bg-line/30"}`}>
                        {s && (
                          <>
                            <div className="line-clamp-2 font-bold leading-tight text-ink">{s.subjectName}</div>
                            {s.room && <div className="text-[10px] text-muted">{s.room}</div>}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
