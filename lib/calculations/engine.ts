// ============================================================
// Pure attendance calculation engine — NO React, NO side effects
// All functions are deterministic and testable.
// ============================================================

import type {
  Subject,
  ClassSession,
  AcademicDay,
  PredictionState,
  AttendanceRequirement,
  SubjectStatus,
} from "@/lib/models/types";
import { isSessionFuture, sessionEnd } from "./dates.ts";

// ------------------------------------------------------------------
// Basic percentage
// ------------------------------------------------------------------

/** attended / total * 100, returns 0 if total === 0 */
export function calcPercentage(attended: number, total: number): number {
  if (total === 0) return 0;
  return (attended / total) * 100;
}

// ------------------------------------------------------------------
// Target check — exact, no floating-point drift
// ------------------------------------------------------------------

/**
 * Does attended/total meet the target?
 *
 * Compares attended*100 against target*total instead of the computed
 * percentage: (57/100)*100 is 56.999… in floating point, which flagged
 * an exactly-57% subject as below a 57% target (and 11/20 as
 * "strictly above" 55%).
 */
export function meetsTarget(
  attended: number,
  total: number,
  target: number,
  requirement: AttendanceRequirement
): boolean {
  const lhs = attended * 100;
  const rhs = target * total;
  const eps = 1e-9 * Math.max(1, Math.abs(rhs));
  return requirement === "atLeast" ? lhs >= rhs - eps : lhs > rhs + eps;
}

// ------------------------------------------------------------------
// Sessions that still count toward the projection
// ------------------------------------------------------------------

/**
 * Sessions the portal's attended/total don't include yet, so the plan
 * (predictions) decides how they count:
 *  - every session that hasn't ended, plus
 *  - sessions that ended *after* the last sync — they've happened, but
 *    won't be in the portal numbers until the next sync. Dropping them
 *    silently turned a planned skip on an earlier class today into an
 *    "ignored" class.
 * Holiday and break days are excluded.
 */
export function upcomingSessions(
  sessions: ClassSession[],
  academicDays: AcademicDay[] = [],
  now: Date = new Date(),
  lastSyncedAt?: string
): ClassSession[] {
  const off = new Set(
    academicDays.filter((d) => d.type === "holiday" || d.type === "break").map((d) => d.date)
  );
  const syncedMs = lastSyncedAt ? Date.parse(lastSyncedAt) : NaN;
  return sessions.filter(
    (s) =>
      !off.has(s.date) &&
      (isSessionFuture(s, now) || (Number.isFinite(syncedMs) && sessionEnd(s).getTime() > syncedMs))
  );
}

// ------------------------------------------------------------------
// Overall attendance across all subjects (weighted sum, not average)
// ------------------------------------------------------------------

export function calcOverallAttendance(subjects: Subject[]): {
  attended: number;
  total: number;
  percentage: number;
} {
  const attended = subjects.reduce((acc, s) => acc + s.attended, 0);
  const total = subjects.reduce((acc, s) => acc + s.total, 0);
  return { attended, total, percentage: calcPercentage(attended, total) };
}

// ------------------------------------------------------------------
// Prediction calculation for a single subject
// ------------------------------------------------------------------

export interface PredictionResult {
  currentAttended: number;
  currentTotal: number;
  currentPercentage: number;
  futurePresent: number;
  futureAbsent: number;
  futureIgnore: number;
  predictedAttended: number;
  predictedTotal: number;
  predictedPercentage: number;
}

/**
 * Given a subject and its future sessions with prediction states,
 * compute the predicted attendance.
 * IGNORE sessions are excluded from prediction total.
 */
export function calcPrediction(
  subject: Subject,
  futureSessions: ClassSession[],
  predictions: Record<string, PredictionState>
): PredictionResult {
  let futurePresent = 0;
  let futureAbsent = 0;
  let futureIgnore = 0;

  for (const session of futureSessions) {
    const state = predictions[session.id] ?? "present";
    if (state === "present") futurePresent++;
    else if (state === "absent") futureAbsent++;
    else futureIgnore++;
  }

  const predictedAttended = subject.attended + futurePresent;
  const predictedTotal = subject.total + futurePresent + futureAbsent;
  const predictedPercentage = calcPercentage(predictedAttended, predictedTotal);

  return {
    currentAttended: subject.attended,
    currentTotal: subject.total,
    currentPercentage: calcPercentage(subject.attended, subject.total),
    futurePresent,
    futureAbsent,
    futureIgnore,
    predictedAttended,
    predictedTotal,
    predictedPercentage,
  };
}

// ------------------------------------------------------------------
// Maximum absences (safe skips) calculation
// ------------------------------------------------------------------

/**
 * How many future classes can be skipped and still meet the target?
 *
 * For requirement "atLeast": attended / (total + skips) >= target/100
 * For requirement "strictlyAbove": attended / (total + skips) > target/100
 *
 * We try increasing skips from 0 until we breach the threshold.
 * Returns the maximum safe number of skips.
 */
export function maxAbsences(
  attended: number,
  total: number,
  target: number,
  requirement: AttendanceRequirement
): number {
  let skips = 0;
  // Safety cap: no point checking more than 500 future classes
  while (skips <= 500 && meetsTarget(attended, total + skips + 1, target, requirement)) {
    skips++;
  }
  return skips;
}

// ------------------------------------------------------------------
// Classes required to recover attendance to target
// ------------------------------------------------------------------

/**
 * How many consecutive classes must be attended (no absences)
 * to reach the target percentage?
 *
 * Solves: (attended + x) / (total + x) >= target/100
 * => attended + x >= t * (total + x)
 * => attended + x >= t*total + t*x
 * => x - t*x >= t*total - attended
 * => x(1-t) >= t*total - attended
 * => x >= (t*total - attended) / (1-t)   [when t < 1]
 *
 * Returns 0 if already at or above target.
 */
export function classesRequiredToReachTarget(
  attended: number,
  total: number,
  target: number,
  requirement: AttendanceRequirement
): number {
  if (meetsTarget(attended, total, target, requirement)) return 0;

  const t = target / 100;
  if (t >= 1) return Infinity;

  // Closed-form estimate, then settle on the exact minimum with the
  // drift-free check (the float estimate can be off by one either way).
  let classes = Math.max(1, Math.ceil((t * total - attended) / (1 - t)));
  while (classes > 1 && meetsTarget(attended + classes - 1, total + classes - 1, target, requirement)) {
    classes--;
  }
  const cap = classes + total + 1000;
  while (!meetsTarget(attended + classes, total + classes, target, requirement)) {
    if (++classes > cap) return Infinity;
  }
  return classes;
}

// ------------------------------------------------------------------
// Subject status
// ------------------------------------------------------------------

/**
 * Returns SAFE / WARNING / DANGER based on current attendance and target.
 * WARNING: within 5 percentage points of target (or no classes held yet)
 * DANGER: below target
 */
export function getSubjectStatus(
  attended: number,
  total: number,
  target: number,
  requirement: AttendanceRequirement
): SubjectStatus {
  // 0 of 0 isn't "below target" — nothing has been missed yet.
  if (total === 0) return "warning";
  if (!meetsTarget(attended, total, target, requirement)) return "danger";
  if (!meetsTarget(attended, total, target + 5, "atLeast")) return "warning";
  return "safe";
}

// ------------------------------------------------------------------
// Overall predicted attendance
// ------------------------------------------------------------------

export function calcOverallPrediction(
  subjects: Subject[],
  allFutureSessions: ClassSession[],
  predictions: Record<string, PredictionState>
): {
  predictedAttended: number;
  predictedTotal: number;
  predictedPercentage: number;
} {
  let predictedAttended = 0;
  let predictedTotal = 0;

  for (const subject of subjects) {
    const futureSessions = allFutureSessions.filter(
      (s) => s.subjectId === subject.id
    );
    const result = calcPrediction(subject, futureSessions, predictions);
    predictedAttended += result.predictedAttended;
    predictedTotal += result.predictedTotal;
  }

  return {
    predictedAttended,
    predictedTotal,
    predictedPercentage: calcPercentage(predictedAttended, predictedTotal),
  };
}
