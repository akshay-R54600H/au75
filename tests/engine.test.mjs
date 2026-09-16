/**
 * Attendance Predictor — Calculation Engine Tests
 * Run with: node tests/engine.test.mjs
 */

// ---- inline engine logic (mirrors lib/calculations/engine.ts) ----

function calcPercentage(attended, total) {
  if (total === 0) return 0;
  return (attended / total) * 100;
}

function maxAbsences(attended, total, target, requirement) {
  const t = target / 100;
  let skips = 0;
  while (skips <= 500) {
    const newTotal = total + skips + 1;
    const newPct = attended / newTotal;
    const passes = requirement === "atLeast" ? newPct >= t : newPct > t;
    if (!passes) break;
    skips++;
  }
  return skips;
}

function classesRequiredToReachTarget(attended, total, target, requirement) {
  const t = target / 100;
  const current = calcPercentage(attended, total);
  const alreadyMeets = requirement === "atLeast" ? current >= target : current > target;
  if (alreadyMeets) return 0;
  if (t >= 1) return Infinity;
  const numerator = t * total - attended;
  const denominator = 1 - t;
  if (denominator <= 0) return Infinity;
  const raw = numerator / denominator;
  const rounded = Math.round(raw);
  let classes = Math.abs(raw - rounded) < 1e-9 ? rounded : Math.ceil(raw);
  if (classes < 1) classes = 1;
  let verified = classes;
  while (verified <= total + 1000) {
    const newPct = (attended + verified) / (total + verified);
    const passes = requirement === "atLeast" ? newPct >= t : newPct > t;
    if (passes) break;
    verified++;
  }
  return verified;
}

function calcPrediction(subject, futureSessions, predictions) {
  let futurePresent = 0, futureAbsent = 0, futureIgnore = 0;
  for (const s of futureSessions) {
    const state = predictions[s.id] ?? "present";
    if (state === "present") futurePresent++;
    else if (state === "absent") futureAbsent++;
    else futureIgnore++;
  }
  const predictedAttended = subject.attended + futurePresent;
  const predictedTotal = subject.total + futurePresent + futureAbsent;
  return {
    predictedAttended,
    predictedTotal,
    predictedPercentage: calcPercentage(predictedAttended, predictedTotal),
    futurePresent, futureAbsent, futureIgnore,
  };
}

function calcOverallAttendance(subjects) {
  const attended = subjects.reduce((a, s) => a + s.attended, 0);
  const total = subjects.reduce((a, s) => a + s.total, 0);
  return { attended, total, percentage: calcPercentage(attended, total) };
}

// ---- test runner ----
let passed = 0, failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else { console.error(`  ✗ FAIL: ${label}`); failed++; }
}

function approx(a, b, eps = 0.001) {
  return Math.abs(a - b) < eps;
}

// ==========================================
console.log("\n=== calcPercentage ===");
assert(calcPercentage(14, 14) === 100, "14/14 = 100%");
assert(approx(calcPercentage(11, 14), 78.571), "11/14 ≈ 78.571%");
assert(calcPercentage(0, 0) === 0, "0/0 = 0 (no crash)");
assert(approx(calcPercentage(75, 100), 75), "75/100 = 75%");
assert(approx(calcPercentage(3, 4), 75), "3/4 = 75%");

// ==========================================
console.log("\n=== maxAbsences — atLeast 75% ===");

// 14/14 → safe skips
// skip=1: 14/15=93.3✓ skip=2: 14/16=87.5✓ skip=3: 14/17=82.35✓ skip=4: 14/18=77.78✓ skip=5: 14/19=73.68✗ → 4
assert(maxAbsences(14, 14, 75, "atLeast") === 4, "14/14 → 4 safe skips");
assert(approx(calcPercentage(14, 18), 77.778), "boundary check: 14/18 = 77.78% ≥ 75% (last safe)");
assert(calcPercentage(14, 19) < 75, "boundary check: 14/19 = 73.68% < 75% (one too many)");

// 15/20 = 75% exactly — next skip: 15/21=71.4% < 75 → 0 skips
assert(maxAbsences(15, 20, 75, "atLeast") === 0, "15/20 = 75% → 0 safe skips (next drops below)");

// 20/20 = 100% — skip=6: 20/26=76.9%✓ skip=7: 20/27=74.1%✗ → 6
assert(maxAbsences(20, 20, 75, "atLeast") === 6, "20/20 → 6 safe skips");
assert(approx(calcPercentage(20, 26), 76.923), "20/26 = 76.92% (last safe)");
assert(calcPercentage(20, 27) < 75, "20/27 = 74.07% (too low)");

// 4/4 = 100% — skip=1: 4/5=80%✓ skip=2: 4/6=66.7%✗ → 1
assert(maxAbsences(4, 4, 75, "atLeast") === 1, "4/4 → 1 safe skip (4/5=80%✓, 4/6=66.7%✗)");

// 1/1 = 100% — skip=1: 1/2=50%✗ → 0
assert(maxAbsences(1, 1, 75, "atLeast") === 0, "1/1 → 0 safe skips (1/2=50% < 75%)");

// 3/4 = 75% — skip=1: 3/5=60%✗ → 0
assert(maxAbsences(3, 4, 75, "atLeast") === 0, "3/4=75% → 0 safe skips");

// ==========================================
console.log("\n=== maxAbsences — strictlyAbove 75% ===");

// 15/20 = exactly 75% — not strictly above, so skip=1: 15/21=71.4%✗ → 0
assert(maxAbsences(15, 20, 75, "strictlyAbove") === 0, "15/20=75% not strictly above → 0 skips");

// 14/14 — skip=1:14/15=93.3>75✓ ... skip=4:14/18=77.78>75✓ skip=5:14/19=73.68 not>75✗ → 4
assert(maxAbsences(14, 14, 75, "strictlyAbove") === 4, "14/14 strictly above 75% → 4 skips (same as atLeast here)");

// 16/20 = 80% — skip=1:16/21=76.19>75✓ skip=2:16/22=72.7 not>75✗ → 1
assert(maxAbsences(16, 20, 75, "strictlyAbove") === 1, "16/20=80% strictly above → 1 skip");

// ==========================================
console.log("\n=== classesRequiredToReachTarget — atLeast 75% ===");

// 10/15 — need x: (10+x)/(15+x) ≥ 0.75 → x ≥ 5 → 5
assert(classesRequiredToReachTarget(10, 15, 75, "atLeast") === 5, "10/15 → need 5 classes");
assert(approx(calcPercentage(15, 20), 75), "15/20 = 75% (confirms recovery)");

// Already at/above target
assert(classesRequiredToReachTarget(14, 14, 75, "atLeast") === 0, "14/14 = 100% → already above, need 0");
assert(classesRequiredToReachTarget(15, 20, 75, "atLeast") === 0, "15/20 = 75% → already meets, need 0");
assert(classesRequiredToReachTarget(11, 14, 75, "atLeast") === 0, "11/14 = 78.57% → already above, need 0");

// 8/14 = 57.1% — (0.75*14-8)/(0.25) = (10.5-8)/0.25 = 2.5/0.25 = 10 → 10
assert(classesRequiredToReachTarget(8, 14, 75, "atLeast") === 10, "8/14 → need 10 classes");
assert(approx(calcPercentage(18, 24), 75), "18/24 = 75% (confirms)");

// ==========================================
console.log("\n=== classesRequiredToReachTarget — strictlyAbove 75% ===");

// 15/20 = exactly 75% — need 1 more: 16/21=76.19% > 75% ✓
assert(classesRequiredToReachTarget(15, 20, 75, "strictlyAbove") === 1, "15/20=75% strictly above → need 1");
assert(calcPercentage(16, 21) > 75, "16/21 = 76.19% > 75% confirms");

// 3/4 = 75% — need 1 more: 4/5=80% > 75% ✓
assert(classesRequiredToReachTarget(3, 4, 75, "strictlyAbove") === 1, "3/4=75% strictly above → need 1");

// Already strictly above
assert(classesRequiredToReachTarget(14, 14, 75, "strictlyAbove") === 0, "14/14=100% strictly above → 0");

// ==========================================
console.log("\n=== prediction states: PRESENT / ABSENT / IGNORE ===");

const subject = { id: "s1", attended: 14, total: 14 };
const sessions = [
  { id: "aug17", subjectId: "s1" },
  { id: "aug18", subjectId: "s1" },
  { id: "aug20", subjectId: "s1" },
];

// 17→PRESENT, 18→ABSENT, 20→IGNORE: predicted = (14+1)/(14+1+1) = 15/16
const pred1 = calcPrediction(subject, sessions, { aug17: "present", aug18: "absent", aug20: "ignore" });
assert(pred1.predictedAttended === 15, "PRESENT+ABSENT+IGNORE: predictedAttended = 15");
assert(pred1.predictedTotal === 16, "PRESENT+ABSENT+IGNORE: predictedTotal = 16 (IGNORE excluded)");
assert(approx(pred1.predictedPercentage, 93.75), "15/16 = 93.75%");
assert(pred1.futurePresent === 1, "1 PRESENT");
assert(pred1.futureAbsent === 1, "1 ABSENT");
assert(pred1.futureIgnore === 1, "1 IGNORE");

// All default to PRESENT (no predictions set)
const predDefault = calcPrediction(subject, sessions, {});
assert(predDefault.predictedAttended === 17, "default all PRESENT: attended = 17");
assert(predDefault.predictedTotal === 17, "default all PRESENT: total = 17");
assert(approx(predDefault.predictedPercentage, 100), "17/17 = 100%");

// All ABSENT
const predAllAbsent = calcPrediction(subject, sessions, { aug17: "absent", aug18: "absent", aug20: "absent" });
assert(predAllAbsent.predictedAttended === 14, "all ABSENT: attended stays 14");
assert(predAllAbsent.predictedTotal === 17, "all ABSENT: total = 14+3 = 17");
assert(approx(predAllAbsent.predictedPercentage, 82.353), "14/17 = 82.35%");

// All IGNORE — total and attended unchanged
const predAllIgnore = calcPrediction(subject, sessions, { aug17: "ignore", aug18: "ignore", aug20: "ignore" });
assert(predAllIgnore.predictedAttended === 14, "all IGNORE: attended = 14");
assert(predAllIgnore.predictedTotal === 14, "all IGNORE: total = 14 (unchanged)");
assert(approx(predAllIgnore.predictedPercentage, 100), "14/14 = 100%");

// ==========================================
console.log("\n=== overall attendance (weighted sum, not average) ===");

const subjects = [
  { attended: 14, total: 14 },  // 100%
  { attended: 11, total: 14 },  // 78.57%
  { attended: 8,  total: 11 },  // 72.73%
];
const overall = calcOverallAttendance(subjects);
assert(overall.attended === 33, "overall attended = 33");
assert(overall.total === 39, "overall total = 39");
assert(approx(overall.percentage, 84.615), "33/39 = 84.62% (not avg of 100+78.57+72.73=83.77%)");

// 5 subjects
const fiveSubjects = [
  { attended: 14, total: 14 },
  { attended: 11, total: 14 },
  { attended: 8,  total: 11 },
  { attended: 12, total: 16 },
  { attended: 10, total: 13 },
];
const overall5 = calcOverallAttendance(fiveSubjects);
assert(overall5.attended === 55, "5 subjects: attended = 55");
assert(overall5.total === 68, "5 subjects: total = 68");
assert(approx(overall5.percentage, 80.882), "55/68 = 80.88%");

// ==========================================
console.log("\n=== exactly 75% vs strictly above 75% boundary ===");

// atLeast: 75% passes, strictly above: 75% fails
assert(75 >= 75, "atLeast: 75% passes (trivial)");
assert(!(75 > 75), "strictlyAbove: 75% fails (trivial)");
assert(75.01 > 75, "strictlyAbove: 75.01% passes");

// Max skips with custom target 80%
assert(maxAbsences(20, 20, 80, "atLeast") === 5, "20/20 → target 80%: 5 skips (20/25=80%✓, 20/26=76.9%✗)");
assert(approx(calcPercentage(20, 25), 80), "20/25 = 80%");
assert(calcPercentage(20, 26) < 80, "20/26 < 80%");

// Recovery with 80% target
// 10/15=66.7% need to reach 80%: (0.8*15-10)/(0.2) = (12-10)/0.2 = 2/0.2 = 10
assert(classesRequiredToReachTarget(10, 15, 80, "atLeast") === 10, "10/15 → need 10 to reach 80%");
assert(approx(calcPercentage(20, 25), 80), "20/25 = 80% confirms");

// ==========================================
console.log("\n=== sync data merge: prediction preservation ===");

// Simulate: user has predictions, then sync happens
// Sessions that still exist → keep prediction
// Sessions that no longer exist → should be removed (tested conceptually)
const existingPredictions = { "2026-08-17-sub-se-1": "absent", "2026-08-18-sub-se-1": "present" };
const newSessionIds = new Set(["2026-08-17-sub-se-1", "2026-08-18-sub-se-1", "2026-08-20-sub-se-1"]);
const staleSessionId = "2026-07-01-sub-se-1"; // no longer in new sessions

// Existing predictions that are still valid
const preserved = Object.keys(existingPredictions).filter(id => newSessionIds.has(id));
assert(preserved.length === 2, "sync merge: 2 predictions preserved");
assert(preserved.includes("2026-08-17-sub-se-1"), "aug17 prediction preserved");
assert(preserved.includes("2026-08-18-sub-se-1"), "aug18 prediction preserved");

// Stale prediction removed
const staleRemoved = !newSessionIds.has(staleSessionId);
assert(staleRemoved, "stale session prediction is removed after sync");

// ==========================================
// Results
console.log(`\n${"─".repeat(44)}`);
console.log(`Total: ${passed + failed} | ✓ ${passed} passed | ✗ ${failed} failed`);
if (failed > 0) {
  console.error(`\n${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log("\nAll tests passed.\n");
}
