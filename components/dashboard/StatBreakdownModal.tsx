"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useApp } from "@/lib/context/AppContext";
import { calcPercentage } from "@/lib/calculations/engine";
import { subjectVerdict } from "@/lib/calculations/summary";
import { fmtPct } from "@/lib/calculations/dates";
import type { Subject } from "@/lib/models/types";

interface StatBreakdownModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "safe-skips" | "at-risk";
}

interface SubjectItemData {
  subject: Subject;
  pct: number;
  verdict: ReturnType<typeof subjectVerdict>;
  afterSkipsPct: number;
  afterRecoveryPct: number;
}

export default function StatBreakdownModal({
  open,
  onClose,
  initialTab = "safe-skips",
}: StatBreakdownModalProps) {
  const { state } = useApp();
  const { attendanceTarget, requirement, showDecimals } = state.settings;
  const [tab, setTab] = useState<"safe-skips" | "at-risk">(initialTab);

  // Sync tab whenever modal opens with a specific target tab
  useEffect(() => {
    if (open) {
      setTab(initialTab);
    }
  }, [open, initialTab]);

  const items: SubjectItemData[] = useMemo(() => {
    return state.subjects.map((s) => {
      const pct = calcPercentage(s.attended, s.total);
      const verdict = subjectVerdict(s.attended, s.total, attendanceTarget, requirement);

      const afterSkipsPct =
        verdict.skips > 0 ? calcPercentage(s.attended, s.total + verdict.skips) : pct;

      const afterRecoveryPct =
        verdict.needed > 0 && verdict.needed !== Infinity
          ? calcPercentage(s.attended + verdict.needed, s.total + verdict.needed)
          : pct;

      return {
        subject: s,
        pct,
        verdict,
        afterSkipsPct,
        afterRecoveryPct,
      };
    });
  }, [state.subjects, attendanceTarget, requirement]);

  const safeSubjects = useMemo(
    () =>
      items
        .filter((item) => item.verdict.skips > 0)
        .sort((a, b) => b.verdict.skips - a.verdict.skips || b.pct - a.pct),
    [items]
  );

  const zeroSkipsSubjects = useMemo(
    () =>
      items
        .filter((item) => item.verdict.skips === 0)
        .sort((a, b) => a.pct - b.pct),
    [items]
  );

  const atRiskSubjects = useMemo(
    () =>
      items
        .filter((item) => item.verdict.status === "danger")
        .sort((a, b) => a.pct - b.pct),
    [items]
  );

  const edgeSubjects = useMemo(
    () =>
      items
        .filter((item) => item.verdict.status === "warning")
        .sort((a, b) => a.pct - b.pct),
    [items]
  );

  const totalSafeSkips = useMemo(
    () => items.reduce((acc, item) => acc + item.verdict.skips, 0),
    [items]
  );

  const [showZeroSkips, setShowZeroSkips] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tab === "safe-skips" ? "Safe Skips Breakdown" : "At Risk Subjects"}
    >
      <div className="p-4 sm:p-5">
        {/* Tab switch control */}
        <div className="mb-4 flex rounded-xl bg-ink/5 p-1">
          <button
            type="button"
            onClick={() => setTab("safe-skips")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === "safe-skips"
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            <CheckCircle2
              size={14}
              className={tab === "safe-skips" ? "text-success" : "text-muted"}
            />
            <span>Safe Skips ({totalSafeSkips})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("at-risk")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === "at-risk"
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            <AlertTriangle
              size={14}
              className={tab === "at-risk" ? "text-danger" : "text-muted"}
            />
            <span>At Risk ({atRiskSubjects.length})</span>
          </button>
        </div>

        {/* Tab: SAFE SKIPS */}
        {tab === "safe-skips" && (
          <div className="space-y-4">
            {/* Overview header */}
            <div className="rounded-xl border border-success/30 bg-success-soft/50 p-3.5">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 shrink-0 text-success" size={18} />
                <div className="text-xs leading-relaxed text-ink">
                  You have{" "}
                  <span className="font-extrabold text-success">
                    {totalSafeSkips} safe skip{totalSafeSkips === 1 ? "" : "s"}
                  </span>{" "}
                  available across{" "}
                  <span className="font-bold">{safeSubjects.length}</span> subject
                  {safeSubjects.length === 1 ? "" : "s"} while staying at or above
                  your <span className="font-bold">{attendanceTarget}%</span> target.
                </div>
              </div>
            </div>

            {/* List of subjects with safe skips */}
            {safeSubjects.length > 0 ? (
              <div className="space-y-3">
                <div className="eyebrow text-faint">
                  Subjects you can skip ({safeSubjects.length})
                </div>

                <div className="flex flex-col gap-2.5">
                  {safeSubjects.map(({ subject, pct, verdict, afterSkipsPct }) => (
                    <div
                      key={subject.id}
                      className="card border border-line p-3.5 transition-all hover:border-line-strong"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-bold text-ink">{subject.name}</h4>
                          <div className="text-xs text-faint">
                            {subject.code}
                            {subject.faculty ? ` · ${subject.faculty}` : ""}
                          </div>
                        </div>

                        {/* Skips pill badge */}
                        <div className="shrink-0 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                            <CheckCircle2 size={13} />
                            Can skip {verdict.skips} {verdict.skips === 1 ? "class" : "classes"}
                          </span>
                        </div>
                      </div>

                      {/* Current & projected stats */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                        <div>
                          Current:{" "}
                          <span className="font-bold text-ink">
                            {fmtPct(pct, showDecimals)}%
                          </span>{" "}
                          ({subject.attended}/{subject.total})
                        </div>
                        <div>
                          After skips:{" "}
                          <span className="font-semibold text-success">
                            {fmtPct(afterSkipsPct, showDecimals)}%
                          </span>
                        </div>
                      </div>

                      {/* Link to subject detail */}
                      <div className="mt-2.5 flex justify-end border-t border-line/60 pt-2">
                        <Link
                          href={`/subjects?subject=${encodeURIComponent(subject.id)}`}
                          onClick={onClose}
                          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-pen hover:underline"
                        >
                          <span>Manage skips in subject</span>
                          <ChevronRight size={13} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card px-4 py-8 text-center">
                <AlertCircle className="mx-auto mb-2 text-muted" size={28} />
                <div className="font-bold text-ink">No Safe Skips Available</div>
                <p className="mt-1 text-xs text-muted">
                  All your subjects are currently at or below your {attendanceTarget}% target.
                  Attending upcoming classes will build up safe skips.
                </p>
              </div>
            )}

            {/* Collapsible section for subjects with 0 skips */}
            {zeroSkipsSubjects.length > 0 && safeSubjects.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowZeroSkips((prev) => !prev)}
                  className="flex w-full items-center justify-between py-1 text-xs font-semibold text-muted hover:text-ink"
                >
                  <span>
                    Subjects with 0 skips remaining ({zeroSkipsSubjects.length})
                  </span>
                  <span className="text-[11px] text-pen">
                    {showZeroSkips ? "Hide" : "Show"}
                  </span>
                </button>

                {showZeroSkips && (
                  <div className="mt-2 space-y-2 animate-fade-in">
                    {zeroSkipsSubjects.map(({ subject, pct, verdict }) => (
                      <div
                        key={subject.id}
                        className="flex items-center justify-between rounded-lg border border-line bg-ink/[0.02] p-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink">
                            {subject.name}
                          </div>
                          <div className="text-[11px] text-faint">{subject.code}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-bold text-ink">
                            {fmtPct(pct, showDecimals)}%
                          </div>
                          <div
                            className={`text-[11px] font-semibold ${
                              verdict.status === "danger" ? "text-danger" : "text-warn"
                            }`}
                          >
                            {verdict.headline}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: AT RISK */}
        {tab === "at-risk" && (
          <div className="space-y-4">
            {/* Overview header */}
            <div
              className={`rounded-xl border p-3.5 ${
                atRiskSubjects.length > 0
                  ? "border-danger/30 bg-danger-soft/50"
                  : "border-success/30 bg-success-soft/50"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {atRiskSubjects.length > 0 ? (
                  <ShieldAlert className="mt-0.5 shrink-0 text-danger" size={18} />
                ) : (
                  <ShieldCheck className="mt-0.5 shrink-0 text-success" size={18} />
                )}
                <div className="text-xs leading-relaxed text-ink">
                  {atRiskSubjects.length > 0 ? (
                    <>
                      <span className="font-extrabold text-danger">
                        {atRiskSubjects.length} subject{atRiskSubjects.length === 1 ? "" : "s"}
                      </span>{" "}
                      {atRiskSubjects.length === 1 ? "is" : "are"} below your{" "}
                      <span className="font-bold">{attendanceTarget}%</span> target and need
                      immediate attendance to recover.
                    </>
                  ) : (
                    <>
                      <span className="font-extrabold text-success">
                        No subjects are at risk!
                      </span>{" "}
                      All your subjects currently meet or exceed your {attendanceTarget}% target.
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* List of at risk subjects */}
            {atRiskSubjects.length > 0 ? (
              <div className="space-y-3">
                <div className="eyebrow text-faint">
                  Subjects below {attendanceTarget}% ({atRiskSubjects.length})
                </div>

                <div className="flex flex-col gap-2.5">
                  {atRiskSubjects.map(
                    ({
                      subject,
                      pct,
                      verdict,
                      afterRecoveryPct,
                    }) => (
                      <div
                        key={subject.id}
                        className="card border border-danger/30 p-3.5 transition-all hover:border-danger/60"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate font-bold text-ink">{subject.name}</h4>
                            <div className="text-xs text-faint">
                              {subject.code}
                              {subject.faculty ? ` · ${subject.faculty}` : ""}
                            </div>
                          </div>

                          {/* Attendance percentage pill */}
                          <div className="shrink-0 text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
                              <AlertTriangle size={13} />
                              {fmtPct(pct, showDecimals)}%
                            </span>
                            <div className="mt-0.5 text-[11px] text-faint">
                              {subject.attended}/{subject.total} attended
                            </div>
                          </div>
                        </div>

                        {/* Recovery requirement */}
                        <div className="mt-2.5 rounded-lg bg-danger-soft/40 p-2.5 text-xs">
                          {verdict.needed === Infinity ? (
                            <div className="font-bold text-danger">
                              Can&apos;t reach {attendanceTarget}% target with remaining classes.
                            </div>
                          ) : (
                            <div className="text-ink">
                              Must attend next{" "}
                              <span className="font-extrabold text-danger">
                                {verdict.needed} {verdict.needed === 1 ? "class" : "classes"}
                              </span>{" "}
                              consecutively to reach{" "}
                              <span className="font-bold text-success">
                                {fmtPct(afterRecoveryPct, showDecimals)}%
                              </span>
                              .
                            </div>
                          )}
                        </div>

                        {/* Link to subject */}
                        <div className="mt-2.5 flex justify-end border-t border-line/60 pt-2">
                          <Link
                            href={`/subjects?subject=${encodeURIComponent(subject.id)}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-pen hover:underline"
                          >
                            <span>View recovery plan</span>
                            <ChevronRight size={13} />
                          </Link>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="card px-4 py-8 text-center">
                <CheckCircle2 className="mx-auto mb-2 text-success" size={32} />
                <div className="font-bold text-ink">All Clear! 🎉</div>
                <p className="mt-1 text-xs text-muted">
                  Every subject currently has at least {attendanceTarget}% attendance.
                  Keep up the great work!
                </p>
              </div>
            )}

            {/* Edge subjects section (warning, on the edge) */}
            {edgeSubjects.length > 0 && (
              <div className="pt-2">
                <div className="eyebrow mb-2 text-warn">
                  ⚠️ On the edge — 0 skips left ({edgeSubjects.length})
                </div>
                <div className="space-y-2">
                  {edgeSubjects.map(({ subject, pct }) => (
                    <div
                      key={subject.id}
                      className="rounded-xl border border-warn/30 bg-warn-soft/30 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-ink">{subject.name}</div>
                          <div className="text-[11px] text-faint">{subject.code}</div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-warn">
                            {fmtPct(pct, showDecimals)}%
                          </span>
                          <div className="text-[10px] text-muted">0 safe skips</div>
                        </div>
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted">
                        Right at the boundary. Missing even 1 class will drop this subject below target!
                      </p>
                      <div className="mt-2 flex justify-end border-t border-warn/20 pt-1.5 text-[11px]">
                        <Link
                          href={`/subjects?subject=${encodeURIComponent(subject.id)}`}
                          onClick={onClose}
                          className="font-semibold text-pen hover:underline"
                        >
                          Details →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal footer with Close button */}
        <div className="mt-5 border-t border-line pt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-ink px-4 py-2 text-xs font-bold text-paper hover:bg-ink/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
