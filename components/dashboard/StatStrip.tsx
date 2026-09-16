"use client";

import { useApp } from "@/lib/context/AppContext";
import { calcOverallAttendance, calcOverallPrediction } from "@/lib/calculations/engine";
import { subjectVerdict } from "@/lib/calculations/summary";
import { fmtPct, fmtDateTime } from "@/lib/calculations/dates";
import CircularProgress from "@/components/ui/CircularProgress";

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "danger" | "success" }) {
  const color = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-ink";
  return (
    <div className="card min-w-[140px] flex-1 snap-start px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className={`font-hand text-3xl font-bold leading-tight ${color}`}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

export default function StatStrip() {
  const { state } = useApp();
  const { attendanceTarget, requirement, showDecimals, lastSyncedAt } = state.settings;

  const overall = calcOverallAttendance(state.subjects);
  const future = state.sessions.filter((s) => s.isFuture);
  const projected = calcOverallPrediction(state.subjects, future, state.predictions);

  const atRisk = state.subjects.filter(
    (s) => subjectVerdict(s.attended, s.total, attendanceTarget, requirement).status === "danger"
  ).length;
  const skipsTotal = state.subjects.reduce(
    (acc, s) => acc + subjectVerdict(s.attended, s.total, attendanceTarget, requirement).skips,
    0
  );
  const plannedSkips = Object.values(state.predictions).filter((p) => p === "absent").length;

  return (
    <section aria-label="Overview" className="mb-6">
      <div className="card mb-3 flex items-center gap-5 p-5">
        <CircularProgress value={overall.percentage} size={104} target={attendanceTarget} decimals={showDecimals} />
        <div className="min-w-0">
          <div className="eyebrow">Overall attendance</div>
          <div className="mt-1 text-sm text-muted">
            <span className="font-bold text-ink">{overall.attended}</span> of{" "}
            <span className="font-bold text-ink">{overall.total}</span> classes
          </div>
          {plannedSkips > 0 && (
            <div className="mt-1 text-sm text-muted">
              Projected <span className="font-bold text-ink">{fmtPct(projected.predictedPercentage, showDecimals)}%</span> with
              your {plannedSkips} planned skip{plannedSkips === 1 ? "" : "s"}
            </div>
          )}
          <div className="mt-2 text-xs text-faint">
            {lastSyncedAt ? `Synced ${fmtDateTime(lastSyncedAt)}` : "Not synced yet"}
          </div>
        </div>
      </div>

      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:mx-0 md:px-0">
        <Stat
          label="Safe skips"
          value={String(skipsTotal)}
          sub="across all subjects"
          tone={skipsTotal === 0 ? "danger" : "success"}
        />
        <Stat
          label="At risk"
          value={String(atRisk)}
          sub={atRisk === 1 ? "subject below target" : "subjects below target"}
          tone={atRisk > 0 ? "danger" : "success"}
        />
        <Stat label="Target" value={`${attendanceTarget}%`} sub={requirement === "atLeast" ? "at least" : "strictly above"} />
      </div>
    </section>
  );
}
