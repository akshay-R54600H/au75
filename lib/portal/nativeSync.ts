// ============================================================
// Portal login — in-app session manager (Capacitor)
//
// Runs entirely on the device: no Next.js server, no CORS. The
// packaged app uses CapacitorHttp for the portal requests and the
// shared pure helpers (classify / findOtpForm / parsers) to drive the
// CAPTCHA + OTP flow:
//
//   1. createNativeSession()  GET login page + CAPTCHA image.
//   2. submitNativeLogin()    POST credentials + typed CAPTCHA
//                             → "otp" (parked) or "done" (data).
//   3. completeNativeOtp()    POST the OTP, then fetch + parse the
//                             attendance and timetable pages.
//
// Sessions live in a module-level store keyed by an opaque token and
// expire after SESSION_TTL_MS, mirroring the server implementation.
// Passwords are never persisted.
// ============================================================

import type { Subject, ClassSession } from "@/lib/models/types";
import { NativePortalHttp, PORTAL_BASE, PORTAL_ORIGIN, type NativePortalResponse } from "./nativeHttp";
import { parseAttendance } from "./attendance";
import { parseTimetable } from "./timetable";
import {
  classify,
  sleep,
  extractFormAction,
  findOtpForm,
  type PageKind,
} from "./loginFlow";

const SESSION_TTL_MS = 10 * 60_000;
const DATA_FETCH_ATTEMPTS = 4;
const DATA_FETCH_BACKOFF_MS = 1500;

const HTTP_OPTS = { timeoutMs: 15000, tries: 2 } as const;

export interface SyncPayload {
  subjects: Subject[];
  sessions: ClassSession[];
}

export type NativeStartResult =
  | { step: "otp"; token: string; message?: string }
  | { step: "done"; data: SyncPayload }
  | {
      step: "failed";
      reason: "invalid-credentials" | "captcha-failed" | "network";
      message: string;
    };

export type NativeOtpResult =
  | { ok: true; data: SyncPayload }
  | { ok: false; message: string };

export type NativeSessionResult =
  | { ok: true; token: string; captcha: string }
  | { ok: false; reason: "network" | "unexpected"; message: string };

interface PendingSession {
  client: NativePortalHttp;
  stage: "captcha" | "session";
  loginHtml: string | null;
  loginReferer: string | null;
  otpHtml: string | null;
  expiresAt: number;
}

export type ClientFactory = (
  baseUrl: string,
  origin: string,
  opts: { timeoutMs: number; tries: number }
) => NativePortalHttp;

const store = new Map<string, PendingSession>();

export function makeToken(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function park(
  client: NativePortalHttp,
  stage: PendingSession["stage"],
  loginHtml: string | null,
  loginReferer: string | null,
  otpHtml: string | null
): string {
  const token = makeToken();
  store.set(token, {
    client,
    stage,
    loginHtml,
    loginReferer,
    otpHtml,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function getPendingSession(token: string): PendingSession | null {
  const s = store.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    store.delete(token);
    return null;
  }
  return s;
}

function dropSession(token: string): void {
  store.delete(token);
}

/**
 * Fetch a single portal page, retrying after a short backoff when the
 * request comes back as the login page (the portal proxy dropped the
 * sticky session) or the network hiccups.
 */
async function fetchDataPage(
  client: NativePortalHttp,
  url: string
): Promise<{ html: string; kind: PageKind }> {
  let lastHtml = "";
  for (let attempt = 1; attempt <= DATA_FETCH_ATTEMPTS; attempt++) {
    let res: NativePortalResponse;
    try {
      res = await client.get(url);
    } catch (err) {
      console.warn(
        `[portal] fetch failed (${attempt}/${DATA_FETCH_ATTEMPTS}):`,
        err instanceof Error ? err.message : err
      );
      if (attempt === DATA_FETCH_ATTEMPTS) throw err;
      await sleep(DATA_FETCH_BACKOFF_MS * attempt);
      continue;
    }

    const kind = classify(res.body);
    if (kind === "data" || kind === "unknown") {
      return { html: res.body, kind };
    }

    lastHtml = res.body;
    console.warn(
      `[portal] data page came back as ${kind} (${attempt}/${DATA_FETCH_ATTEMPTS}); retrying...`
    );
    await sleep(DATA_FETCH_BACKOFF_MS * attempt);
  }

  return { html: lastHtml, kind: classify(lastHtml) };
}

async function fetchDataPages(client: NativePortalHttp): Promise<SyncPayload> {
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

  const bothAuthBlocked =
    (attendanceRes.kind === "login" ||
      attendanceRes.kind === "dashboard" ||
      attendanceRes.kind === "otp") &&
    (timetableRes.kind === "login" ||
      timetableRes.kind === "dashboard" ||
      timetableRes.kind === "otp");

  if (bothAuthBlocked) {
    const reason =
      attendanceRes.kind === "otp" || timetableRes.kind === "otp"
        ? "The portal still requires an OTP before data can be fetched."
        : "The portal dropped the login session while fetching data (its servers switch between requests). Please press Sync and log in again.";
    throw new Error(reason);
  }

  return {
    subjects: parseAttendance(attendanceRes.html) ?? [],
    sessions: parseTimetable(timetableRes.html) ?? [],
  };
}

/**
 * Step 1 — create a fresh portal session and hand back the CAPTCHA
 * image so the user can read and type it in the app.
 */
export async function createNativeSession(
  factory: ClientFactory = defaultFactory
): Promise<NativeSessionResult> {
  const client = factory(PORTAL_BASE, PORTAL_ORIGIN, HTTP_OPTS);
  try {
    const page = await client.get(`${PORTAL_BASE}/StudentLogin.do`);
    if (!client.isLoginPage(page.body)) {
      return {
        ok: false,
        reason: "unexpected",
        message: "The portal did not return its login page.",
      };
    }

    const captchaRes = await client.getBinary(`${PORTAL_BASE}/Captcha.jpg`);
    const captcha = `data:image/png;base64,${captchaRes.body}`;

    return {
      ok: true,
      token: park(client, "captcha", page.body, page.finalUrl, null),
      captcha,
    };
  } catch (err) {
    return {
      ok: false,
      reason: "network",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Step 2 — submit student ID / password + the typed CAPTCHA.
 */
export async function submitNativeLogin(
  token: string,
  studentId: string,
  password: string,
  captcha: string
): Promise<NativeStartResult> {
  const s = getPendingSession(token);
  if (!s || s.stage !== "captcha") {
    return {
      step: "failed",
      reason: "invalid-credentials",
      message: "Session expired. Please start again.",
    };
  }
  const { client, loginHtml, loginReferer } = s;

  if (!loginHtml) {
    return {
      step: "failed",
      reason: "invalid-credentials",
      message: "Session expired. Please start again.",
    };
  }
  const pageHtml = loginHtml;
  if (!client.isLoginPage(pageHtml)) {
    try {
      const data = await fetchDataPages(client);
      return { step: "done", data };
    } catch {
      return {
        step: "failed",
        reason: "network",
        message: "The portal session became invalid. Please start again.",
      };
    }
  }

  try {
    const resp = await client.postForm(
      extractFormAction(pageHtml),
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
      loginReferer ?? undefined
    );

    const kind = classify(resp.body);
    if (kind === "login") {
      return {
        step: "failed",
        reason: "invalid-credentials",
        message:
          "Wrong student ID, password or CAPTCHA. Please check and try again.",
      };
    }

    s.stage = "session";
    s.otpHtml = resp.body;

    let data: SyncPayload;
    try {
      data = await fetchDataPages(client);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[portal] data fetch after login failed; treating as OTP-pending: ${msg}`
      );
      return {
        step: "otp",
        token,
        message:
          "Check your email/phone — the portal should have sent you an OTP. Enter it below.",
      };
    }
    dropSession(token);
    return { step: "done", data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const net = /fetch failed|ECONN|ENOTFOUND|timeout|network/i.test(msg);
    return {
      step: "failed",
      reason: net ? "network" : "invalid-credentials",
      message: net
        ? "Cannot reach the portal. Check your connection and try again."
        : msg,
    };
  }
}

/** Complete the OTP step and fetch data with the now-authenticated session. */
export async function completeNativeOtp(
  token: string,
  otp: string
): Promise<NativeOtpResult> {
  const s = getPendingSession(token);
  if (!s || s.stage !== "session") {
    return { ok: false, message: "Session expired. Start again." };
  }
  const { client } = s;

  try {
    const otpPageHtml =
      s.otpHtml ?? (await client.get(`${PORTAL_BASE}/StudentLogin.do`)).body;

    const form = findOtpForm(otpPageHtml);
    if (!form) {
      return {
        ok: false,
        message:
          "Could not find the OTP form on the portal page. The page structure may have changed.",
      };
    }

    form.fields[form.otpField] = otp;
    const resp = await client.postForm(
      form.action,
      form.fields,
      `${PORTAL_BASE}/StudentLogin.do`
    );

    const kind = classify(resp.body);
    if (kind === "login") {
      return { ok: false, message: "OTP was rejected. Check it and try again." };
    }
    if (kind === "otp") {
      return { ok: false, message: "The portal still asks for an OTP. Try again." };
    }

    const data = await fetchDataPages(client);
    dropSession(token);
    if (data.subjects.length === 0 && data.sessions.length === 0) {
      return {
        ok: false,
        message:
          "Logged in, but no attendance/timetable rows could be parsed. The page structure may have changed.",
      };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/** Default client factory (used when no mock is injected). */
export function defaultFactory(
  baseUrl: string,
  origin: string,
  opts: { timeoutMs: number; tries: number }
): NativePortalHttp {
  return new NativePortalHttp(baseUrl, origin, opts);
}
