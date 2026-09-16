"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { useApp } from "@/lib/context/AppContext";
import { todayISO, fmtRange, minutes, fmtLong } from "@/lib/calculations/dates";
import PredictionToggle from "@/components/ui/PredictionToggle";

/** Today's classes, in order, with the one happening right now highlighted. */
export default function TodayStrip() {
  const { state, setPrediction } = useApp();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const today = todayISO(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const sessions = state.sessions
    .filter((s) => s.date === today)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  const nextDay = sessions.length
    ? null
    : state.sessions.filter((s) => s.date > today).sort((a, b) => a.date.localeCompare(b.date))[0]?.date;

  return (
    <section aria-labelledby="today-heading" className="mb-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="today-heading" className="font-hand text-2xl font-bold text-ink">Today</h2>
        <span className="text-xs text-faint">{fmtLong(today)}</span>
      </div>

      {sessions.length === 0 ? (
        <div className="card px-4 py-4 text-sm text-muted">
          No classes today.{" "}
          {nextDay && (
            <Link href="/calendar" className="font-semibold text-accent-deep">
              Next class is on {fmtLong(nextDay)} →
            </Link>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => {
            const ongoing =
              !!s.startTime && !!s.endTime && nowMin >= minutes(s.startTime) && nowMin <= minutes(s.endTime);
            const done = !!s.endTime && nowMin > minutes(s.endTime);
            const pred = state.predictions[s.id] ?? "present";
            return (
              <li
                key={s.id}
                className={`card flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                  ongoing ? "border-accent bg-accent-soft/50 shadow-[3px_3px_0_rgb(var(--accent)/0.35)]" : done ? "opacity-60" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/subjects?subject=${encodeURIComponent(s.subjectId)}`} className="truncate font-bold text-ink hover:underline">
                      {s.subjectName}
                    </Link>
                    {ongoing && (
                      <span className="rounded-full bg-marker px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Now
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><Clock size={12} />{fmtRange(s.startTime, s.endTime)}</span>
                    {s.room && <span className="inline-flex items-center gap-1"><MapPin size={12} />{s.room}</span>}
                  </div>
                </div>
                {s.isFuture && !done && (
                  <PredictionToggle size="sm" value={pred} onChange={(v) => setPrediction(s.id, v)} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
