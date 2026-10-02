/**
 * Verification test for Safe Skips & At Risk breakdown logic.
 * Run with: node tests/stat_breakdown.test.mjs
 */
import { calcPercentage } from "../lib/calculations/engine.ts";
import { subjectVerdict } from "../lib/calculations/summary.ts";
import { MOCK_SUBJECTS } from "../lib/mock/data.ts";

let passed = 0, failed = 0;
function assert(c, msg) {
  if (c) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log("=== Safe Skips & At Risk Breakdown Tests ===");

const target = 75;
const requirement = "atLeast";

// Compute stats across mock subjects
const items = MOCK_SUBJECTS.map((s) => {
  const pct = calcPercentage(s.attended, s.total);
  const verdict = subjectVerdict(s.attended, s.total, target, requirement);
  const afterSkipsPct = verdict.skips > 0 ? calcPercentage(s.attended, s.total + verdict.skips) : pct;
  const afterRecoveryPct = verdict.needed > 0 && verdict.needed !== Infinity
    ? calcPercentage(s.attended + verdict.needed, s.total + verdict.needed)
    : pct;
  return { subject: s, pct, verdict, afterSkipsPct, afterRecoveryPct };
});

const safe = items.filter((i) => i.verdict.skips > 0);
const atRisk = items.filter((i) => i.verdict.status === "danger");
const edge = items.filter((i) => i.verdict.status === "warning");

// 1. Safe skips tests
assert(safe.length > 0, "Finds subjects with safe skips");
for (const item of safe) {
  assert(item.verdict.skips > 0, `${item.subject.name} has ${item.verdict.skips} safe skips`);
  assert(item.afterSkipsPct >= target, `${item.subject.name} attendance after skips (${item.afterSkipsPct.toFixed(1)}%) remains >= ${target}%`);
}

// 2. At risk tests
assert(atRisk.length === 2, "Identifies 2 at-risk subjects from mock data");
for (const item of atRisk) {
  assert(item.pct < target, `${item.subject.name} attendance (${item.pct.toFixed(1)}%) is below ${target}%`);
  assert(item.verdict.needed > 0, `${item.subject.name} requires attending ${item.verdict.needed} classes to recover`);
  assert(item.afterRecoveryPct >= target, `${item.subject.name} recovered attendance (${item.afterRecoveryPct.toFixed(1)}%) reaches >= ${target}%`);
}

// 3. Edge / Warning tests
assert(edge.length > 0, "Identifies borderline / on-the-edge subjects");
for (const item of edge) {
  assert(item.verdict.skips === 0, `${item.subject.name} on the edge has exactly 0 safe skips`);
  assert(item.pct >= target, `${item.subject.name} currently meets target (${item.pct.toFixed(1)}%)`);
}

console.log(`\n${"─".repeat(44)}\nTotal: ${passed + failed} | ✓ ${passed} passed | ✗ ${failed} failed\n`);
if (failed > 0) process.exit(1);
