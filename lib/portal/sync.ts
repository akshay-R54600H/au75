// ============================================================
// Portal Sync — client-side fetch + parse pipeline
//
// Architecture (confirmed from probe):
//   The portal requires OTP which only works in a browser session.
//   The user logs in manually (opens portal tab, completes CAPTCHA + OTP),
//   then returns to the app and presses Sync.
//
//   On web: fetch() with credentials from the same browser context.
//   On Capacitor WebView: same — the WebView shares cookies with
//     in-app browser sessions when using @capacitor/browser.
//
//   CORS note: The portal does NOT send CORS headers, so cross-origin
//   fetch() from localhost/the-app-origin will be blocked.
//   Solution: use a proxy route (/api/portal-proxy) that forwards
//   the request server-side, or use Capacitor HTTP plugin.
// ============================================================

import type { Subject, ClassSession, AcademicDay } from "@/lib/models/types";
import { parseAttendance } from "./attendance";
import { parseTimetable } from "./timetable";
import { parseAcademicCalendar } from "./academicCalendar";
import {
  PORTAL_ATTENDANCE_URL,
  PORTAL_TIMETABLE_URL,
  classifyPortalPage,
} from "./auth";

export type SyncResult =
  | { ok: true; subjects: Subject[]; sessions: ClassSession[]; academicDays: AcademicDay[] }
  | { ok: false; reason: "not-authenticated" | "cors" | "parse-failed" | "network" | "otp-required"; message: string };

/**
 * Attempt to fetch portal data pages.
 *
 * This must be called from a browser context where the user
 * has already completed the portal login + OTP.
 */
export async function fetchPortalData(): Promise<SyncResult> {
  // Try to fetch attendance via proxy (avoids CORS)
  try {
    const [attendanceResult, timetableResult] = await Promise.allSettled([
      fetchViaProxy(PORTAL_ATTENDANCE_URL),
      fetchViaProxy(PORTAL_TIMETABLE_URL),
    ]);

    const attendanceHtml =
      attendanceResult.status === "fulfilled" ? attendanceResult.value : null;
    const timetableHtml =
      timetableResult.status === "fulfilled" ? timetableResult.value : null;

    // Check if we got redirected to login
    if (attendanceHtml) {
      const kind = classifyPortalPage(attendanceHtml);
      if (kind === "login" || kind === "captcha-error") {
        return { ok: false, reason: "not-authenticated", message: "Session expired. Please log in again." };
      }
      // OTP page = not yet fully authenticated
      if (kind === "otp") {
        return { ok: false, reason: "otp-required", message: "OTP required. Complete login in the portal." };
      }
    }

    const subjects = attendanceHtml ? parseAttendance(attendanceHtml) : null;
    const sessions = timetableHtml ? parseTimetable(timetableHtml) : null;

    if (!attendanceHtml && !timetableHtml) {
      return {
        ok: false,
        reason: "network",
        message:
          "Could not reach the portal pages. Make sure you are logged in, then try again.",
      };
    }

    if (!subjects && !sessions) {
      return {
        ok: false,
        reason: "parse-failed",
        message:
          "Could not parse portal data. The page structure may have changed.",
      };
    }

    return {
      ok: true,
      subjects: subjects ?? [],
      sessions: sessions ?? [],
      academicDays: [],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("CORS") || msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      return {
        ok: false,
        reason: "cors",
        message: "Cannot reach the portal. Check your connection and make sure you are logged in.",
      };
    }

    return { ok: false, reason: "network", message: msg };
  }
}

/**
 * Fetch a portal URL via the Next.js proxy route to avoid CORS.
 * The proxy forwards the request server-side with the session cookie.
 */
async function fetchViaProxy(portalUrl: string): Promise<string> {
  const proxyUrl = `/api/portal-proxy?url=${encodeURIComponent(portalUrl)}`;
  const res = await fetch(proxyUrl, { credentials: "include" });
  if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
  return res.text();
}
