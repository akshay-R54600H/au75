"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useApp } from "@/lib/context/AppContext";
import { calcOverallAttendance, calcOverallPrediction, getSubjectStatus, upcomingSessions } from "@/lib/calculations/engine";
import { subjectVerdict } from "@/lib/calculations/summary";
import { fmtPct, fmtDateTime } from "@/lib/calculations/dates";
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
      className={`card relative min-w-0 px-3 py-3 text-left transition-all sm:px-4 ${
        clickable
          ? "pressable cursor-pointer hover:border-line-strong hover:shadow-md group focus-visible:ring-2 focus-visible:ring-pen"
          : ""
      }`}
      aria-haspopup={clickable ? "dialog" : undefined}
    >
      <div className="flex items-center justify-between gap-1 pr-4 sm:pr-0">
        <div className="eyebrow max-sm:text-[10px] max-sm:tracking-[0.08em]">{label}</div>
        {clickable && (
          <>
            <ChevronRight size={14} className="absolute right-2 top-3 text-faint sm:hidden" aria-hidden="true" />
            <span className="hidden text-[10px] font-semibold text-faint opacity-70 transition-opacity group-hover:text-ink group-hover:opacity-100 sm:inline">
              View →
            </span>
          </>
        )}
      </div>
      <div className={`font-hand text-3xl font-bold leading-tight ${color}`}>{value}</div>
      {sub && <div className="text-[11px] leading-snug text-muted sm:text-xs">{sub}</div>}
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
  const future = upcomingSessions(state.sessions, state.academicDays, undefined, state.settings.lastSyncedAt);
  const projected = calcOverallPrediction(state.subjects, future, state.predictions);

  const atRisk = state.subjects.filter(
    (s) => subjectVerdict(s.attended, s.total, attendanceTarget, requirement).status === "danger"
  ).length;
  const skipsTotal = state.subjects.reduce(
    (acc, s) => acc + subjectVerdict(s.attended, s.total, attendanceTarget, requirement).skips,
    0
  );
  // Only skips the projection actually counts (not ones on classes already in the portal totals).
  const plannedSkips = future.filter((s) => state.predictions[s.id] === "absent").length;

  return (
    <section aria-label="Overview" className="mb-6">
      <div className="card mb-3 flex items-center gap-5 p-5">
        <CircularProgress
          value={overall.percentage}
          size={104}
          target={attendanceTarget}
          decimals={showDecimals}
          status={getSubjectStatus(overall.attended, overall.total, attendanceTarget, requirement)}
        />
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

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
