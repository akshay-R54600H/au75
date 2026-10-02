"use client";

import { useState } from "react";
import { useApp } from "@/lib/context/AppContext";
import { calcOverallAttendance, calcOverallPrediction } from "@/lib/calculations/engine";
import { subjectVerdict } from "@/lib/calculations/summary";
import { fmtPct, fmtDateTime, isSessionFuture } from "@/lib/calculations/dates";
import CircularProgress from "@/components/ui/CircularProgress";
import StatBreakdownModal from "@/components/dashboard/StatBreakdownModal";

function Stat({
  label,
  value,
  sub,
  tone,
  onClick,
  clickable,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "danger" | "success";
  onClick?: () => void;
  clickable?: boolean;
}) {
  const color = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-ink";
  const Component = clickable ? "button" : "div";

  return (
    <Component
      type={clickable ? "button" : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`card min-w-[140px] flex-1 snap-start px-4 py-3 text-left transition-all ${
        clickable
          ? "cursor-pointer hover:border-line-strong hover:shadow-md active:scale-[0.98] group focus-visible:ring-2 focus-visible:ring-pen"
          : ""
      }`}
      aria-haspopup={clickable ? "dialog" : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="eyebrow">{label}</div>
        {clickable && (
          <span className="text-[10px] font-semibold text-faint opacity-70 group-hover:opacity-100 group-hover:text-ink transition-opacity">
            View →
          </span>
        )}
      </div>
      <div className={`font-hand text-3xl font-bold leading-tight ${color}`}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </Component>
  );
}

export default function StatStrip() {
  const { state } = useApp();
  const { attendanceTarget, requirement, showDecimals, lastSyncedAt } = state.settings;
  const [modalState, setModalState] = useState<{ open: boolean; tab: "safe-skips" | "at-risk" }>({
    open: false,
    tab: "safe-skips",
  });

  const overall = calcOverallAttendance(state.subjects);
  const future = state.sessions.filter((s) => s.isFuture && isSessionFuture(s));
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
          clickable
          onClick={() => setModalState({ open: true, tab: "safe-skips" })}
        />
        <Stat
          label="At risk"
          value={String(atRisk)}
          sub={atRisk === 1 ? "subject below target" : "subjects below target"}
          tone={atRisk > 0 ? "danger" : "success"}
          clickable
          onClick={() => setModalState({ open: true, tab: "at-risk" })}
        />
        <Stat label="Target" value={`${attendanceTarget}%`} sub={requirement === "atLeast" ? "at least" : "strictly above"} />
      </div>

      <StatBreakdownModal
        open={modalState.open}
        onClose={() => setModalState((prev) => ({ ...prev, open: false }))}
        initialTab={modalState.tab}
      />
    </section>
  );
}
