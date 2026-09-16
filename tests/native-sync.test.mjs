/**
 * Native sync engine tests (lib/portal/nativeSync.ts)
 * Run with: npx tsx tests/native-sync.test.mjs
 *
 * Uses a mock HTTP client so no portal/network is involved. The mock
 * replays the flow against the real captured portal HTML found in
 * /tmp/portal-debug (attendance.html + timetable.html).
 */

import { readFileSync } from "node:fs";

import { createNativeSession, submitNativeLogin, completeNativeOtp } from "../lib/portal/nativeSync.ts";
import { parseAttendance } from "../lib/portal/attendance.ts";
import { parseTimetable } from "../lib/portal/timetable.ts";

function loadFixture(name) {
  return readFileSync(`/tmp/portal-debug/${name}.html`, "utf8");
}

const ATTENDANCE_HTML = loadFixture("attendance");
const TIMETABLE_HTML = loadFixture("timetable");

let failures = 0;
let checks = 0;

function assert(cond, msg) {
  checks++;
  if (!cond) {
    failures++;
    console.error(`  ✗ ${msg}`);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

// ---------------------------------------------------------------
// Mock client that emulates the portal flow using fixture pages.
// ---------------------------------------------------------------
class MockClient {
  constructor() {
    this.calls = [];
    this.loginHtml = fixtureLoginPage();
    this.captchaBody = "cGFzc2lvbi1jYXB0Y2hhLWJ5dGVz"; // base64 "passion-captcha-bytes"
    this.captchaPage = this.loginHtml;
    this.postLoginBody = fixtureOtpPage();
    this.dataHtml = ATTENDANCE_HTML;
    this.timetableHtml = TIMETABLE_HTML;
    this.failOnLogin = false;
    this.authenticated = false;
    this.posts = 0;
  }

  async get(path) {
    this.calls.push(["GET", path]);
    if (path.includes("Captcha.jpg")) {
      return { status: 200, body: this.captchaBody, finalUrl: path, headers: {} };
    }
    if (path.includes("StudentLogin.do")) {
      return { status: 200, body: this.loginHtml, finalUrl: path, headers: {} };
    }
    if (path.includes("AttendanceSummary") || path.includes("TimeTable")) {
      // Not authenticated (OTP pending) → the portal re-serves the login
      // page, exactly like the real proxy drops the session mid-sync.
      if (!this.authenticated) {
        return { status: 200, body: this.loginHtml, finalUrl: path, headers: {} };
      }
      const body = path.includes("AttendanceSummary") ? this.dataHtml : this.timetableHtml;
      return { status: 200, body, finalUrl: path, headers: {} };
    }
    throw new Error(`unexpected GET ${path}`);
  }

  async getBinary(path) {
    return { status: 200, body: this.captchaBody, finalUrl: path };
  }

  async postForm(path, fields, referer) {
    this.posts++;
    this.calls.push(["POST", path, fields]);
    if (this.failOnLogin) return { status: 200, body: this.loginHtml, finalUrl: path, headers: {} };
    if (path.includes("LoginAction")) {
      // Successful creds+captcha → the portal either goes straight to a
      // data page (no OTP) or returns the OTP page.
      if (/attendance|timetable/i.test(this.postLoginBody)) {
        this.authenticated = true;
      }
      return { status: 200, body: this.postLoginBody, finalUrl: path, headers: {} };
    }
    // OTP verification POST → now authenticated, back to the data page.
    this.authenticated = true;
    return { status: 200, body: this.dataHtml, finalUrl: path, headers: {} };
  }

  isLoginPage(body) {
    return /StudentLogin\.do|name="loginform"|captchaId/i.test(body);
  }
}

function fixtureLoginPage() {
  return `<!doctype html>
<html><head><title>Student Login</title></head><body>
<form name="loginform" action="/auerp/StudentLoginAction.do" method="post">
<input type="hidden" name="method" value="studentLoginAction">
<input type="hidden" name="formName" value="loginform">
<input type="hidden" name="pageType" value="2">
<input type="hidden" name="serverDownMessage" value="">
<input type="hidden" name="errorMessage" value="">
<input type="text" name="userName">
<input type="password" name="password">
<input type="text" name="captcha">
</form>
</body></html>`;
}

function fixtureOtpPage() {
  return `<!doctype html>
<html><head><title>Verify OTP</title></head><body>
<form action="/auerp/ValidateOtpAction.do" method="post">
<input type="hidden" name="method" value="validateOtp">
<input type="hidden" name="userName" value="student">
<input type="text" name="otpCode" maxlength="6">
</form>
</body></html>`;
}

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

async function testLoginWithoutOtp() {
  console.log("\nLogin → data directly (no OTP step):");
  const client = new MockClient();
  // Force the post-login response to be the data page (no OTP).
  client.postLoginBody = ATTENDANCE_HTML;

  const session = await createNativeSession(
    () => client
  );
  assert(session.ok === true, "createNativeSession succeeds");
  assert(typeof session.token === "string", "session has a token");
  assert(session.captcha.startsWith("data:image/png;base64,"), "captcha is a data URL");

  const start = await submitNativeLogin(
    session.token,
    "student@student.edu.in",
    "secret",
    "ABCD"
  );
  assert(start.step === "done", `login completes without OTP (got ${start.step})`);
  assert(start.data.subjects.length > 0, `parsed ${start.data.subjects.length} subjects`);
  assert(start.data.sessions.length > 0, `parsed ${start.data.sessions.length} sessions`);
}

async function testLoginWithOtp() {
  console.log("\nLogin → OTP step → verify OTP → data:");
  const client = new MockClient();

  const session = await createNativeSession(() => client);
  assert(session.ok === true, "createNativeSession succeeds");

  const start = await submitNativeLogin(
    session.token,
    "student@student.edu.in",
    "secret",
    "ABCD"
  );
  assert(start.step === "otp", `login parks at OTP step (got ${start.step})`);
  assert(typeof start.token === "string", "OTP step carries the same token");

  const otp = await completeNativeOtp(start.token, "123456");
  assert(otp.ok === true, `OTP verification succeeds (${otp.message ?? ""})`);
  assert(otp.data.subjects.length > 0, `parsed ${otp.data.subjects.length} subjects`);
  assert(otp.data.sessions.length > 0, `parsed ${otp.data.sessions.length} sessions`);
}

async function testWrongCredentials() {
  console.log("\nWrong credentials → failed:");
  const client = new MockClient();
  client.failOnLogin = true;

  const session = await createNativeSession(() => client);
  const start = await submitNativeLogin(
    session.token,
    "student@student.edu.in",
    "wrong",
    "ZZZZ"
  );
  assert(start.step === "failed", `login fails (got ${start.step})`);
  assert(
    start.reason === "invalid-credentials",
    `reason is invalid-credentials (got ${start.reason})`
  );
}

async function testSessionExpired() {
  console.log("\nStale token → session expired:");
  const start = await submitNativeLogin("definitely-not-a-token", "x", "y", "z");
  assert(start.step === "failed", "stale token fails");
  assert(start.message.includes("expired"), "mentions expiry");
}

// ---------------------------------------------------------------

console.log("Sanity: fixture parsers");
const subj = parseAttendance(ATTENDANCE_HTML) ?? [];
const sess = parseTimetable(TIMETABLE_HTML) ?? [];
assert(subj.length > 0, `attendance fixture parses (${subj.length})`);
assert(sess.length > 0, `timetable fixture parses (${sess.length})`);

await testLoginWithoutOtp();
await testLoginWithOtp();
await testWrongCredentials();
await testSessionExpired();

console.log(`\n${checks} checks, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
