// ============================================================
// Portal login — stateless session flow (route handlers only)
//
// The AU portal needs CAPTCHA + OTP. Each step returns a sealed token
// (see sessionToken.ts) that carries the portal cookies forward, so
// the flow works on serverless hosts with no shared memory:
//
//   1. createLoginSession()  GET login page + CAPTCHA image.
//                            → { token, captcha }
//   2. submitLogin()         POST credentials + typed captcha.
//                            → "otp" (new token), "done" (data), or
//                              "failed" (creds/captcha rejected).
//   3. completeOtp()         POST the OTP, then fetch + parse the
//                            attendance + timetable pages.
//
// Passwords are never stored or logged.
// ============================================================

import type { Subject, ClassSession } from "../models/types";
import { PortalHttp, PORTAL_BASE } from "./portalHttp";
import { seal, open } from "./sessionToken";
import { parseAttendance } from "../portal/attendance";
import { parseTimetable } from "../portal/timetable";
import {
  classify,
  sleep,
  extractFormAction,
  extractFormFields,
  findOtpForm,
  type PageKind,
} from "../portal/loginFlow";

// Vercel functions cap at 60s on Hobby: keep retries short.
const DATA_FETCH_ATTEMPTS = 3;
const DATA_FETCH_BACKOFF_MS = 1200;
const HTTP_OPTS = { timeoutMs: 12000, tries: 2 } as const;

export interface SyncPayload {
  subjects: Subject[];
  sessions: ClassSession[];
}

export type StartResult =
  | { step: "otp"; token: string; message?: string }
  | { step: "done"; data: SyncPayload }
  | {
      step: "failed";
      reason: "invalid-credentials" | "captcha-failed" | "network";
      message: string;
    };

export type OtpResult =
  | { ok: true; data: SyncPayload }
  | { ok: false; message: string };

export type SessionResult =
  | { ok: true; token: string; captcha: string }
  | { ok: false; reason: "network" | "unexpected"; message: string };

const EXPIRED = "Session expired. Please start again.";

async function fetchDataPage(
  client: PortalHttp,
  url: string
): Promise<{ html: string; kind: PageKind }> {
  let lastHtml = "";
  for (let attempt = 1; attempt <= DATA_FETCH_ATTEMPTS; attempt++) {
    let body: string;
    try {
      body = (await client.get(url)).body;
    } catch (err) {
      if (attempt === DATA_FETCH_ATTEMPTS) throw err;
      await sleep(DATA_FETCH_BACKOFF_MS * attempt);
      continue;
    }
    const kind = classify(body);
    if (kind === "data" || kind === "unknown") return { html: body, kind };
    // login/dashboard/otp ⇒ the LB re-homed us; retry.
    lastHtml = body;
    await sleep(DATA_FETCH_BACKOFF_MS * attempt);
  }
  return { html: lastHtml, kind: classify(lastHtml) };
}

async function fetchDataPages(client: PortalHttp): Promise<SyncPayload> {
  const [attendanceRes, timetableRes] = await Promise.all([
    fetchDataPage(
      client,
      `${PORTAL_BASE}/studentWiseAttendanceSummary.do?method=getIndividualStudentWiseSubjectAndActivityAttendanceSummary`
    ),
    fetchDataPage(
      client,
      `${PORTAL_BASE}/viewMyTimeTable.do?method=initViewStudentTimeTable`
    ),
  ]);

  const blocked = (k: PageKind) => k === "login" || k === "dashboard" || k === "otp";
  if (blocked(attendanceRes.kind) && blocked(timetableRes.kind)) {
    throw new Error(
      attendanceRes.kind === "otp" || timetableRes.kind === "otp"
        ? "The portal still requires an OTP before data can be fetched."
        : "The portal dropped the login session while fetching data. Please press Sync and log in again."
    );
  }

  return {
    subjects: parseAttendance(attendanceRes.html) ?? [],
    sessions: parseTimetable(timetableRes.html) ?? [],
  };
}

/** Step 1 — fresh portal session + CAPTCHA image for the user to read. */
export async function createLoginSession(): Promise<SessionResult> {
  const client = new PortalHttp(PORTAL_BASE, undefined, HTTP_OPTS);
  try {
    const page = await client.get(`${PORTAL_BASE}/StudentLogin.do`);
    if (page.status >= 500) {
      return {
        ok: false,
        reason: "network",
        message: `The AU portal is down right now (HTTP ${page.status}). Try again in a while.`,
      };
    }
    if (!client.isLoginPage(page.body)) {
      return { ok: false, reason: "unexpected", message: "The portal did not return its login page." };
    }
    const captchaRes = await client.getBinary(`${PORTAL_BASE}/Captcha.jpg`);
    return {
      ok: true,
      token: seal({
        stage: "captcha",
        cookies: client.getCookies(),
        sessionToken: client.sessionToken,
        loginAction: extractFormAction(page.body),
        loginReferer: page.finalUrl,
        otpForm: null,
      }),
      captcha: `data:image/png;base64,${captchaRes.body.toString("base64")}`,
    };
  } catch (err) {
    return { ok: false, reason: "network", message: err instanceof Error ? err.message : String(err) };
  }
}

/** Step 2 — submit student ID / password + the typed CAPTCHA. */
export async function submitLogin(
  token: string,
  studentId: string,
  password: string,
  captcha: string
): Promise<StartResult> {
  const s = open(token);
  if (!s || s.stage !== "captcha") {
    return { step: "failed", reason: "invalid-credentials", message: EXPIRED };
  }
  const client = PortalHttp.restore(s.cookies, s.sessionToken, HTTP_OPTS);

  try {
    const resp = await client.postForm(
      s.loginAction,
      {
        method: "studentLoginAction",
        formName: "loginform",
        pageType: "2",
        serverDownMessage: "",
        errorMessage: "",
        userName: studentId,
        password,
        captcha,
        remember: "1",
      },
      s.loginReferer ?? undefined
    );

    if (classify(resp.body) === "login") {
      const portalError = (extractFormFields(resp.body).errorMessage ?? "").trim();
      const isCaptchaError = /captcha|security\s*cod|verification cod/i.test(portalError);
      const message =
        isCaptchaError
          ? "The CAPTCHA didn't match. Tap Refresh for a new image and try again."
          : portalError &&
              /invalid|wrong|incorrect|not\s*exist|enter\s*(a\s*)?(valid|correct)|user.{0,4}name|password/i.test(
                portalError
              )
            ? `The portal says: ${portalError}`
            : "Wrong student ID or password. Please check and try again.";
      return {
        step: "failed",
        reason: isCaptchaError ? "captcha-failed" : "invalid-credentials",
        message,
      };
    }

    // Credentials accepted. The response is usually the OTP page, but the
    // portal sometimes skips OTP — so try for data first, and only park
    // the session for the OTP step if that fails.
    try {
      return { step: "done", data: await fetchDataPages(client) };
    } catch {
      return {
        step: "otp",
        token: seal({
          stage: "session",
          cookies: client.getCookies(),
          sessionToken: client.sessionToken,
          loginAction: s.loginAction,
          loginReferer: s.loginReferer,
          otpForm: findOtpForm(resp.body),
        }),
        message: "Check your email — the portal sent you an OTP. Enter it below.",
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const net = /fetch failed|ECONN|ENOTFOUND|timeout|aborted/i.test(msg);
    return {
      step: "failed",
      reason: net ? "network" : "invalid-credentials",
      message: net ? "Cannot reach the portal. Check your connection and try again." : msg,
    };
  }
}

/** Step 3 — complete the OTP and fetch data with the authenticated session. */
export async function completeOtp(token: string, otp: string): Promise<OtpResult> {
  const s = open(token);
  if (!s || s.stage !== "session") return { ok: false, message: EXPIRED };
  const client = PortalHttp.restore(s.cookies, s.sessionToken, HTTP_OPTS);

  try {
    const form =
      s.otpForm ?? findOtpForm((await client.get(`${PORTAL_BASE}/StudentLogin.do`)).body);
    if (!form) {
      return {
        ok: false,
        message: "Could not find the OTP form on the portal page. The page structure may have changed.",
      };
    }

    const fields = { ...form.fields, [form.otpField]: otp };
    const resp = await client.postForm(form.action, fields, `${PORTAL_BASE}/StudentLogin.do`);

    const kind = classify(resp.body);
    if (kind === "login") return { ok: false, message: "OTP was rejected. Check it and try again." };
    if (kind === "otp") return { ok: false, message: "The portal still asks for an OTP. Try again." };

    const data = await fetchDataPages(client);
    if (data.subjects.length === 0 && data.sessions.length === 0) {
      return {
        ok: false,
        message: "Logged in, but no attendance/timetable rows could be parsed. The page structure may have changed.",
      };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
