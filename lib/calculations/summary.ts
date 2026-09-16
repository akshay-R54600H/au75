// One-line verdict for a subject: the thing students actually want to know.

import type { AttendanceRequirement } from "@/lib/models/types";
import { maxAbsences, classesRequiredToReachTarget, getSubjectStatus } from "./engine.ts";

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
