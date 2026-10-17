/**
 * Tests against the REAL modules (Node ≥22.18 strips TS types natively).
 * Run with: node tests/summary.test.mjs
 */
import { subjectVerdict, planVerdict } from "../lib/calculations/summary.ts";
import { maxAbsences, classesRequiredToReachTarget, getSubjectStatus, upcomingSessions } from "../lib/calculations/engine.ts";
import { fmtTime, fmtPct, minutes, todayISO, isSessionFuture } from "../lib/calculations/dates.ts";
import { seal, open } from "../lib/server/sessionToken.ts";

let passed = 0, failed = 0;
function assert(c, msg) {
  if (c) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log("=== subjectVerdict ===");
let v = subjectVerdict(21, 24, 75, "atLeast");
assert(v.status === "safe" && v.skips === 4 && v.headline === "Can skip 4", "21/24 → safe, can skip 4 (21/28 = 75%)");
v = subjectVerdict(18, 24, 75, "atLeast");
assert(v.status === "warning" && v.skips === 0 && v.headline === "On the edge", "18/24 = 75% exactly → on the edge");
v = subjectVerdict(14, 20, 75, "atLeast");
assert(v.status === "danger" && v.needed === 4 && v.headline === "Attend 4 more", "14/20 = 70% → attend 4 more (18/24)");
v = subjectVerdict(0, 10, 100, "atLeast");
assert(v.status === "danger" && v.headline === "Can't recover", "100% target when already missed → can't recover");
v = subjectVerdict(9, 14, 75, "strictlyAbove");
assert(v.status === "danger", "9/14 = 64% strictly above → danger");
v = subjectVerdict(1, 1, 75, "atLeast");
assert(v.headline === "Can skip 0" || v.headline === "On the edge", "1/1 → 1/2 = 50% fails, so on the edge");

console.log("\n=== exact target checks (no float drift) ===");
v = subjectVerdict(57, 100, 57, "atLeast");
assert(v.status !== "danger", "57/100 meets a 57% target (float gave 56.999…)");
v = subjectVerdict(29, 50, 58, "atLeast");
assert(v.status !== "danger", "29/50 meets a 58% target");
v = subjectVerdict(11, 20, 55, "strictlyAbove");
assert(v.status === "danger" && v.needed === 1, "11/20 = 55% is not strictly above 55% (float gave 55.000…1)");
v = subjectVerdict(3, 4, 75, "strictlyAbove");
assert(v.status === "danger" && v.needed === 1, "3/4 = 75% strictly above → attend 1 more (4/5 = 80%)");
v = subjectVerdict(0, 0, 75, "atLeast");
assert(v.status !== "danger", "0/0 (no classes yet) is not at risk");
assert(getSubjectStatus(3, 4, 75, "strictlyAbove") === "danger", "status honours strictly-above at exactly the target");
// Brute-force cross-check against pure integer math
let mismatches = 0;
for (const req of ["atLeast", "strictlyAbove"]) {
  for (const target of [55, 57, 58, 60, 65, 75, 80, 85]) {
    for (let total = 0; total <= 60; total++) {
      for (let a = 0; a <= total; a++) {
        const ok = (x, y) => (req === "atLeast" ? x * 100 >= target * y : x * 100 > target * y);
        let skips = 0;
        while (ok(a, total + skips + 1)) skips++;
        let need = 0;
        while (!ok(a + need, total + need)) need++;
        if (maxAbsences(a, total, target, req) !== skips) mismatches++;
        if (total > 0 && classesRequiredToReachTarget(a, total, target, req) !== need) mismatches++;
      }
    }
  }
}
assert(mismatches === 0, `skips / classes-needed match exact integer math (${mismatches} mismatches)`);

console.log("\n=== upcomingSessions ===");
const at = new Date("2026-10-02T10:30:00");
const mk = (id, date, startTime, endTime, isFuture = true) => ({ id, date, startTime, endTime, isFuture });
const up = upcomingSessions(
  [
    mk("ended", "2026-10-02", "08:00", "08:55"),
    mk("later", "2026-10-02", "14:00", "14:55"),
    mk("holiday", "2026-10-05", "09:00", "09:55"),
    mk("break", "2026-10-06", "09:00", "09:55"),
    mk("normal", "2026-10-07", "09:00", "09:55"),
  ],
  [{ date: "2026-10-05", type: "holiday" }, { date: "2026-10-06", type: "break" }, { date: "2026-10-07", type: "working" }],
  at
).map((s) => s.id);
assert(up.join(",") === "later,normal", "skips ended classes (even if cached as future), holidays and breaks");
const upSynced = upcomingSessions(
  [mk("before-sync", "2026-10-02", "07:00", "07:55", false), mk("after-sync", "2026-10-02", "08:00", "08:55", false), mk("later", "2026-10-02", "14:00", "14:55")],
  [],
  at,
  new Date("2026-10-02T08:00:00").toISOString()
).map((s) => s.id);
assert(upSynced.join(",") === "after-sync,later", "a class that ended after the last sync still counts (portal doesn't have it yet)");

console.log("\n=== planVerdict (skips within the planned semester) ===");
// 18/20 now, 20 classes left all planned as attend → 38/40.
let pv = planVerdict({ predictedAttended: 38, predictedTotal: 40, futurePresent: 20, futureAbsent: 0 }, 75, "atLeast");
assert(pv.skips === 8, `38/40 planned → 8 skips (30/40 = 75%), got ${pv.skips}`);
// Mark 4 of them as skip → 34/40: exactly 4 more, so 4 + 4 = 8 in total.
pv = planVerdict({ predictedAttended: 34, predictedTotal: 40, futurePresent: 16, futureAbsent: 4 }, 75, "atLeast");
assert(pv.skips === 4 && pv.headline === "Can skip 4 more", `after planning 4 skips → 4 more, got ${pv.skips}`);
pv = planVerdict({ predictedAttended: 30, predictedTotal: 40, futurePresent: 12, futureAbsent: 8 }, 75, "atLeast");
assert(pv.skips === 0 && pv.status === "warning", "exactly at target after planned skips → on the edge");
pv = planVerdict({ predictedAttended: 28, predictedTotal: 40, futurePresent: 10, futureAbsent: 10 }, 75, "atLeast");
assert(pv.status === "danger" && pv.needed === 2 && pv.headline === "Cancel 2 skips", "28/40 → cancel 2 planned skips (30/40)");
pv = planVerdict({ predictedAttended: 20, predictedTotal: 40, futurePresent: 10, futureAbsent: 2 }, 75, "atLeast");
assert(pv.status === "danger" && pv.headline === "Can't recover", "even cancelling every skip isn't enough → can't recover");
// The old bug: projected numbers through subjectVerdict overstated it (10, then 5).
assert(subjectVerdict(38, 40, 75, "atLeast").skips === 10, "(old model would have said 10 — extra classes, not converted ones)");

console.log("\n=== dates ===");
assert(fmtTime("08:00") === "8:00 am", "08:00 → 8:00 am");
assert(fmtTime("14:05") === "2:05 pm", "14:05 → 2:05 pm");
assert(fmtTime("12:00") === "12:00 pm", "12:00 → 12:00 pm");
assert(fmtTime("00:30") === "12:30 am", "00:30 → 12:30 am");
assert(minutes("09:30") === 570, "09:30 → 570 minutes");
assert(fmtPct(74.56, false) === "74" && fmtPct(74.56, true) === "74.5", "fmtPct truncates — 74.56% never shows as 75%");
assert(fmtPct(74.96, true) === "74.9", "74.96% shows 74.9, not 75.0");
assert(fmtPct((57 / 100) * 100, false) === "57" && fmtPct(75, true) === "75.0", "fmtPct keeps exact values despite float noise");
assert(/^\d{4}-\d{2}-\d{2}$/.test(todayISO()), "todayISO is ISO date");
assert(todayISO(new Date(2026, 0, 5)) === "2026-01-05", "todayISO pads month/day");

console.log("\n=== isSessionFuture (timetable class end detection) ===");
const fixedNow = new Date("2026-10-02T10:30:00"); // 10:30 AM
// Future date
assert(isSessionFuture({ date: "2026-10-03", startTime: "08:00", endTime: "08:55" }, fixedNow) === true, "future date is future");
// Past date
assert(isSessionFuture({ date: "2026-10-01", startTime: "08:00", endTime: "08:55" }, fixedNow) === false, "past date is not future");
// Same day, class ended at 09:55 AM
assert(isSessionFuture({ date: "2026-10-02", startTime: "09:00", endTime: "09:55" }, fixedNow) === false, "class ended at 09:55 AM is no longer future at 10:30 AM");
// Same day, class ends at 10:55 AM (currently ongoing)
assert(isSessionFuture({ date: "2026-10-02", startTime: "10:00", endTime: "10:55" }, fixedNow) === true, "ongoing class ending at 10:55 AM is still future at 10:30 AM");
// Same day, upcoming class at 14:00 PM
assert(isSessionFuture({ date: "2026-10-02", startTime: "14:00", endTime: "14:55" }, fixedNow) === true, "upcoming class today is future");
// Same day, class ended exact minute: 10:30 AM with endTime 10:30
assert(isSessionFuture({ date: "2026-10-02", startTime: "09:35", endTime: "10:30" }, fixedNow) === false, "class ending at 10:30 AM is ended at 10:30 AM");

console.log("\n=== sessionToken (stateless sessions) ===");
const state = { stage: "captcha", cookies: { JSESSIONID: "abc.tomcat1" }, sessionToken: "abc.tomcat1", loginAction: "/auerp/StudentLoginAction.do", loginReferer: null, otpForm: null };
const tok = seal(state);
assert(typeof tok === "string" && !tok.includes("tomcat1"), "token is opaque ciphertext");
const back = open(tok);
assert(back && back.cookies.JSESSIONID === "abc.tomcat1" && back.stage === "captcha", "round-trips state");
assert(back.exp > Date.now(), "carries an expiry");
assert(open(tok.slice(0, -4) + "AAAA") === null, "tampered token is rejected");
assert(open("garbage") === null, "garbage token is rejected");

console.log(`\n${"─".repeat(44)}\nTotal: ${passed + failed} | ✓ ${passed} passed | ✗ ${failed} failed`);
if (failed > 0) process.exit(1);
