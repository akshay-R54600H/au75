"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Clock, User, RotateCcw } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useApp } from "@/lib/context/AppContext";
import { calcPercentage, calcPrediction } from "@/lib/calculations/engine";
import { subjectVerdict } from "@/lib/calculations/summary";
import { fmtDay, fmtWeekday, fmtTime, fmtRange, fmtPct } from "@/lib/calculations/dates";
import type { ClassSession, PredictionState } from "@/lib/models/types";
import CircularProgress from "@/components/ui/CircularProgress";
import Button from "@/components/ui/Button";

const TONE = { safe: "text-success", warning: "text-warn", danger: "text-danger" } as const;
const SOFT = { safe: "bg-success-soft", warning: "bg-warn-soft", danger: "bg-danger-soft" } as const;

function cycle(s: PredictionState): PredictionState {
  return s === "present" ? "absent" : s === "absent" ? "ignore" : "present";
}

function tileClass(state: PredictionState, isToday: boolean): string {
  const base = "flex min-h-[60px] flex-col justify-center rounded-xl border-2 p-1.5 text-center transition-colors";
  if (state === "absent") return `${base} border-danger bg-danger-soft text-danger`;
  if (state === "ignore") return `${base} border-line bg-line/40 text-faint line-through`;
  return `${base} ${isToday ? "border-accent bg-accent-soft/50" : "border-dashed border-line-strong bg-surface"} text-ink`;
}

export default function SubjectDetail({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const { state, setPrediction, setPredictions } = useApp();
  const subject = state.subjects.find((s) => s.id === subjectId);

  if (!subject) {
    return (
      <AppShell title="Subject">
        <p className="text-muted">Subject not found.</p>
      </AppShell>
    );
  }

  const { attendanceTarget, requirement, showDecimals, milestones } = state.settings;
  const today = new Date().toISOString().slice(0, 10);

  const future = state.sessions
    .filter((s) => s.subjectId === subjectId && s.isFuture)
    .sort((a, b) => a.date.localeCompare(b.date) || a.session - b.session);

  const currentPct = calcPercentage(subject.attended, subject.total);
  const plan = calcPrediction(subject, future, state.predictions);
  const v = subjectVerdict(plan.predictedAttended, plan.predictedTotal, attendanceTarget, requirement);

  const upcomingMilestones = milestones
    .filter((m) => m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  function resetPlan() {
    const entries: Record<string, PredictionState> = {};
    for (const s of future) entries[s.id] = "present";
    setPredictions(entries);
  }

  const meta = [
    subject.faculty && { icon: User, text: subject.faculty },
    (subject.room ?? future[0]?.room) && { icon: MapPin, text: subject.room ?? future[0]?.room },
    future[0]?.startTime && { icon: Clock, text: fmtRange(future[0].startTime, future[0].endTime) },
  ].filter(Boolean) as { icon: typeof User; text: string }[];

  return (
    <AppShell>
      <button onClick={() => router.back()} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-hand text-3xl font-bold leading-tight text-ink">{subject.name}</h1>
            <div className="text-sm text-faint">{subject.code}{subject.credits != null ? ` · ${subject.credits} credits` : ""}</div>
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {meta.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2"><Icon size={14} className="text-faint" />{text}</li>
              ))}
              <li>
                Attended <strong className="text-ink">{subject.attended}</strong> of <strong className="text-ink">{subject.total}</strong>
              </li>
            </ul>
          </div>
          <CircularProgress value={currentPct} size={96} target={attendanceTarget} decimals={showDecimals} />
        </div>

        <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${SOFT[v.status]} ${TONE[v.status]}`}>
          {v.sentence}
        </div>
      </div>

      <section className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="Planned skips" value={String(plan.futureAbsent)} tone={plan.futureAbsent ? "danger" : undefined} />
        <Stat label="Projected" value={`${fmtPct(plan.predictedPercentage, showDecimals)}%`} tone={v.status} />
        <Stat label="Classes left" value={String(future.length - plan.futureIgnore)} />
      </section>

      {upcomingMilestones.length > 0 && (
        <section className="mt-5">
          <h2 className="eyebrow mb-2">Before your exams</h2>
          <div className="flex flex-col gap-2">
            {upcomingMilestones.map((m) => {
              const until = future.filter((s) => s.date < m.date);
              const p = calcPrediction(subject, until, state.predictions);
              const mv = subjectVerdict(p.predictedAttended, p.predictedTotal, attendanceTarget, requirement);
              return (
                <div key={m.id} className="card flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <div className="font-bold text-ink">{m.label}</div>
                    <div className="text-xs text-muted">{fmtDay(m.date)} · {until.length} classes before</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-hand text-2xl font-bold ${TONE[mv.status]}`}>{fmtPct(p.predictedPercentage, showDecimals)}%</div>
                    <div className="text-xs text-muted">{mv.headline}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-6">
        <div className="mb-2 flex items-end justify-between gap-2">
          <div>
            <h2 className="font-hand text-2xl font-bold text-ink">Plan your skips</h2>
            <p className="text-xs text-muted">Tap a class: attend → skip → ignore</p>
          </div>
          {plan.futureAbsent + plan.futureIgnore > 0 && (
            <Button variant="ghost" size="sm" onClick={resetPlan}><RotateCcw size={14} /> Reset</Button>
          )}
        </div>

        {future.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
            No upcoming classes for this subject.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {future.map((s: ClassSession) => {
              const ps = state.predictions[s.id] ?? "present";
              return (
                <button
                  key={s.id}
                  type="button"
                  className={tileClass(ps, s.date === today)}
                  onClick={() => setPrediction(s.id, cycle(ps))}
                  aria-label={`${fmtDay(s.date)} ${fmtWeekday(s.date)}: ${ps}`}
                >
                  <div className="text-xs font-bold leading-tight">{fmtDay(s.date)}</div>
                  <div className="text-[10px] opacity-70">{fmtWeekday(s.date)}</div>
                  {s.startTime && <div className="text-[10px] opacity-70">{fmtTime(s.startTime)}</div>}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted">
          <Legend className="border-2 border-dashed border-line-strong bg-surface" label="Attend" />
          <Legend className="bg-danger" label="Skip" />
          <Legend className="bg-line-strong" label="Ignore (not counted)" />
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: keyof typeof TONE }) {
  return (
    <div className="card px-3 py-2.5">
      <div className="eyebrow">{label}</div>
      <div className={`font-hand text-2xl font-bold ${tone ? TONE[tone] : "text-ink"}`}>{value}</div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded ${className}`} />
      {label}
    </span>
  );
}
