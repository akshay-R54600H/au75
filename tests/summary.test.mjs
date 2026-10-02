/**
 * Tests against the REAL modules (Node ≥22.18 strips TS types natively).
 * Run with: node tests/summary.test.mjs
 */
import { subjectVerdict } from "../lib/calculations/summary.ts";
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

console.log("\n=== dates ===");
assert(fmtTime("08:00") === "8:00 am", "08:00 → 8:00 am");
assert(fmtTime("14:05") === "2:05 pm", "14:05 → 2:05 pm");
assert(fmtTime("12:00") === "12:00 pm", "12:00 → 12:00 pm");
assert(fmtTime("00:30") === "12:30 am", "00:30 → 12:30 am");
assert(minutes("09:30") === 570, "09:30 → 570 minutes");
assert(fmtPct(74.56, false) === "75" && fmtPct(74.56, true) === "74.6", "fmtPct rounds / one decimal");
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
