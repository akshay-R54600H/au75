// One-line verdict for a subject: the thing students actually want to know.

import type { AttendanceRequirement } from "@/lib/models/types";
import { maxAbsences, classesRequiredToReachTarget, getSubjectStatus, meetsTarget } from "./engine.ts";

export interface Verdict {
  status: "safe" | "warning" | "danger";
  /** Short headline, e.g. "Can skip 3 more" */
  headline: string;
  /** Longer sentence for detail views. */
  sentence: string;
  skips: number;
  needed: number;
}

export function subjectVerdict(
  attended: number,
  total: number,
  target: number,
  requirement: AttendanceRequirement
): Verdict {
  const status = getSubjectStatus(attended, total, target, requirement);
  const skips = maxAbsences(attended, total, target, requirement);
  const needed = classesRequiredToReachTarget(attended, total, target, requirement);
  const cls = (n: number) => `${n} class${n === 1 ? "" : "es"}`;

  if (status === "danger") {
    return needed === Infinity
      ? { status, skips, needed, headline: "Can't recover", sentence: `Below ${target}% — you can't reach the target with the classes left.` }
      : { status, skips, needed, headline: `Attend ${needed} more`, sentence: `Attend the next ${cls(needed)} without missing any to get back to ${target}%.` };
  }
  if (skips === 0) {
    return { status: "warning", skips, needed, headline: "On the edge", sentence: `You're right at ${target}% — don't miss the next class.` };
  }
  return {
    status,
    skips,
    needed,
    headline: `Can skip ${skips}`,
    sentence: `You can skip ${cls(skips)} and still stay at or above ${target}%.`,
  };
}

/**
 * Verdict for a *planned* semester (current attendance + every remaining
 * class marked attend/skip/ignore).
 *
 * Unlike subjectVerdict — which asks "how many extra classes can I miss in
 * a row?" — the remaining classes are already in the projection, so skipping
 * one turns a planned attend into a miss: (attended − k) / total. Feeding the
 * projected numbers to subjectVerdict counted each skip as an *extra* class
 * (attended / (total + k)) and overstated the safe skips.
 */
export function planVerdict(
  plan: { predictedAttended: number; predictedTotal: number; futurePresent: number; futureAbsent: number },
  target: number,
  requirement: AttendanceRequirement
): Verdict {
  const { predictedAttended: a, predictedTotal: t, futurePresent, futureAbsent } = plan;
  const status = getSubjectStatus(a, t, target, requirement);
  const more = futureAbsent > 0 ? " more" : "";

  if (!meetsTarget(a, t, target, requirement)) {
    // Cancelling a planned skip turns that class back into an attend.
    let needed = 1;
    while (needed <= futureAbsent && !meetsTarget(a + needed, t, target, requirement)) needed++;
    if (needed > futureAbsent) {
      return {
        status: "danger",
        skips: 0,
        needed: Infinity,
        headline: "Can't recover",
        sentence: `Even attending every remaining class, you'd finish below ${target}%.`,
      };
    }
    return {
      status: "danger",
      skips: 0,
      needed,
      headline: `Cancel ${needed} skip${needed === 1 ? "" : "s"}`,
      sentence: `Attend ${needed} of your planned skips to finish at ${target}%.`,
    };
  }

  let skips = 0;
  while (skips < futurePresent && meetsTarget(a - skips - 1, t, target, requirement)) skips++;

  if (skips === 0) {
    return {
      status: "warning",
      skips,
      needed: 0,
      headline: "On the edge",
      sentence:
        futurePresent === 0
          ? `No classes left to plan — you finish at or above ${target}%.`
          : `Don't skip any${more} — one more miss drops you below ${target}%.`,
    };
  }
  return {
    status,
    skips,
    needed: 0,
    headline: `Can skip ${skips}${more}`,
    sentence: `You can skip ${skips}${more} class${skips === 1 ? "" : "es"} of the ${futurePresent} you're attending and still finish at or above ${target}%.`,
  };
}
