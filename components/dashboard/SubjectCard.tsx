"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Subject } from "@/lib/models/types";
import { calcPercentage } from "@/lib/calculations/engine";
import { subjectVerdict } from "@/lib/calculations/summary";
import { fmtPct } from "@/lib/calculations/dates";
import { useApp } from "@/lib/context/AppContext";
import ProgressBar from "@/components/ui/ProgressBar";

const TONE = { safe: "text-success", warning: "text-warn", danger: "text-danger" } as const;

export default function SubjectCard({ subject }: { subject: Subject }) {
  const { state } = useApp();
  const { attendanceTarget, requirement, showDecimals } = state.settings;
  const pct = calcPercentage(subject.attended, subject.total);
  const v = subjectVerdict(subject.attended, subject.total, attendanceTarget, requirement);

  return (
    <Link
      href={`/subjects?subject=${encodeURIComponent(subject.id)}`}
      className="card block p-4 transition-transform hover:-translate-y-0.5"
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
          <div className="text-xs text-faint">{subject.attended}/{subject.total}</div>
        </div>
      </div>

      <div className="my-3">
        <ProgressBar value={pct} target={attendanceTarget} label={`${subject.name} attendance`} />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-sm font-bold ${TONE[v.status]}`}>{v.headline}</span>
        <ChevronRight size={16} className="text-faint" />
      </div>
    </Link>
  );
}
