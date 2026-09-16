// ============================================================
// Pure attendance calculation engine — NO React, NO side effects
// All functions are deterministic and testable.
// ============================================================

import type {
  Subject,
  ClassSession,
  PredictionState,
  AttendanceRequirement,
  SubjectStatus,
} from "@/lib/models/types";

// ------------------------------------------------------------------
// Basic percentage
// ------------------------------------------------------------------

/** attended / total * 100, returns 0 if total === 0 */
export function calcPercentage(attended: number, total: number): number {
  if (total === 0) return 0;
  return (attended / total) * 100;
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
  const t = target / 100;

  let skips = 0;
  // Safety cap: no point checking more than 500 future classes
  while (skips <= 500) {
    const newTotal = total + skips + 1;
    const newPct = attended / newTotal;

    const passes =
      requirement === "atLeast" ? newPct >= t : newPct > t;

    if (!passes) break;
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
  const t = target / 100;
  const current = calcPercentage(attended, total);

  const alreadyMeets =
    requirement === "atLeast" ? current >= target : current > target;

  if (alreadyMeets) return 0;

  if (t >= 1) {
    return Infinity;
  }

  const numerator = t * total - attended;
  const denominator = 1 - t;

  if (denominator <= 0) return Infinity;

  const raw = numerator / denominator;
  // Round to nearest integer first to handle floating-point imprecision
  // e.g. 10.0000000002 should be treated as 10, not rounded up to 11
  const rounded = Math.round(raw);
  let classes = Math.abs(raw - rounded) < 1e-9 ? rounded : Math.ceil(raw);

  // Ensure at least 1 class if we haven't met target yet
  if (classes < 1) classes = 1;

  // Verify with integer-safe check and increment if floating point is off
  let verified = classes;
  while (verified <= total + 1000) {
    const newPct = (attended + verified) / (total + verified);
    const passes =
      requirement === "atLeast" ? newPct >= t : newPct > t;
    if (passes) break;
    verified++;
  }

  return verified;
}

// ------------------------------------------------------------------
// Subject status
// ------------------------------------------------------------------

/**
 * Returns SAFE / WARNING / DANGER based on current attendance and target.
 * WARNING: within 5 percentage points of target
 * DANGER: below target
 */
export function getSubjectStatus(
  attended: number,
  total: number,
  target: number,
  requirement: AttendanceRequirement
): SubjectStatus {
  const pct = calcPercentage(attended, total);
  const t = target;

  const atTarget =
    requirement === "atLeast" ? pct >= t : pct > t;

  if (!atTarget) return "danger";
  if (pct < t + 5) return "warning";
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
