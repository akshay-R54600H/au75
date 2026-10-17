"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Subject } from "@/lib/models/types";
import { calcPercentage, calcPrediction, upcomingSessions } from "@/lib/calculations/engine";
import { subjectVerdict, planVerdict } from "@/lib/calculations/summary";
import { fmtPct } from "@/lib/calculations/dates";
import { useApp } from "@/lib/context/AppContext";
import ProgressBar from "@/components/ui/ProgressBar";

const TONE = { safe: "text-success", warning: "text-warn", danger: "text-danger" } as const;

export default function SubjectCard({
  subject,
  baseHref = "/subjects",
}: {
  subject: Subject;
  baseHref?: string;
}) {
  const { state } = useApp();
  const { attendanceTarget, requirement, showDecimals } = state.settings;
  const pct = calcPercentage(subject.attended, subject.total);
  const v = subjectVerdict(subject.attended, subject.total, attendanceTarget, requirement);

  const future = upcomingSessions(state.sessions, state.academicDays, undefined, state.settings.lastSyncedAt).filter((s) => s.subjectId === subject.id);
  const plan = calcPrediction(subject, future, state.predictions);
  const pv = planVerdict(plan, attendanceTarget, requirement);

  return (
    <Link
      href={`${baseHref}?subject=${encodeURIComponent(subject.id)}`}
      className="card pressable group block p-4 hover:-translate-y-0.5"
      aria-label={`${subject.name}: ${fmtPct(pct, true)}%, ${v.headline}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-bold text-ink">{subject.name}</div>
          <div className="text-xs text-faint">{subject.code}{subject.faculty ? ` · ${subject.faculty}` : ""}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`font-hand text-3xl font-bold leading-none ${TONE[v.status]}`}>
            {fmtPct(pct, showDecimals)}%
          </div>
          <div className="mt-1 text-xs font-bold text-ink">
            Projected: <span className={`text-sm font-extrabold ${TONE[pv.status]}`}>{fmtPct(plan.predictedPercentage, showDecimals)}%</span>
          </div>
        </div>
      </div>

      <div className="my-3">
        <ProgressBar value={pct} target={attendanceTarget} status={v.status} label={`${subject.name} attendance`} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-bold ${TONE[v.status]}`}>{v.headline}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-pen group-hover:underline">
          <span>Manage skips in subject</span>
          <ChevronRight size={15} className="shrink-0 text-faint group-hover:text-pen transition-colors" />
        </span>
      </div>
    </Link>
  );
}
