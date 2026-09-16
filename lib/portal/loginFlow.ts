// ============================================================
// Portal login flow — pure helpers (server + native client)
//
// Shared by the server-side session manager (lib/server/portalSessions)
// and the server-side sync engine (lib/server/portalSessions).
// No Node or Capacitor imports here — just regex over page HTML,
// so this module can run anywhere.
// ============================================================

export type PageKind = "login" | "otp" | "dashboard" | "data" | "unknown";

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Classify a portal response. Deliberately stricter than the
 * client-side version: "otp" requires an OTP form marker, not just
 * the substring "otp" anywhere (the login page itself contains
 * "otP" in bundled JS, which fooled earlier probes).
 *
 * Order matters: an authenticated data page may legitimately contain
 * `name="loginform"` markup (header search forms etc.), so "data" and
 * "dashboard" are checked BEFORE the login-form marker.
 */
export function classify(html: string): PageKind {
  const lower = html.toLowerCase();
  const hasLoginForm = /name="loginform"|studentLoginAction\.do|captchaId/i.test(html);
  const hasHome = /logout|student home|welcome/i.test(lower);
  const hasData = /attendance|timetable|time.?table/i.test(lower);
  const isOtp =
    /name="[^"]*otp[^"]*"/i.test(html) ||
    /verification code|enter the code|one time password/i.test(lower);

  // A page with neither the requested data nor a login form is very
  // likely an intermediate gateway (OTP entry / payment verification).
  // A login page is ONLY "login" if it is NOT serving data to this
  // authenticated session and does NOT show a home shell.
  const notLoggedIn = hasLoginForm && !hasHome && !hasData;

  if (hasData) return "data";
  if (hasHome) return "dashboard";
  if (isOtp) return "otp";
  if (notLoggedIn) return "login";
  return "unknown";
}

export function extractFormAction(html: string): string {
  const m = html.match(/<form[^>]*action="([^"]+)"/i);
  if (m && m[1]) return m[1];
  // No action attribute: fall back to the canonical login endpoint.
  // withSession() adds ;jsessionid= only in cookieless mode.
  return `/auerp/StudentLoginAction.do`;
}

/** Find all input names/values in the first <form> of a page. */
export function extractFormFields(html: string): Record<string, string> {
  const formMatch = html.match(/<form[^>]*>([\s\S]*?)<\/form>/i);
  const scope = formMatch ? formMatch[1] : html;
  const fields: Record<string, string> = {};
  const inputRe = /<input\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = inputRe.exec(scope)) !== null) {
    const nameMatch = m[0].match(/name\s*=\s*"([^"]+)"/i);
    if (!nameMatch) continue;
    const valueMatch = m[0].match(/value\s*=\s*"([^"]*)"/i);
    fields[nameMatch[1]] = valueMatch ? valueMatch[1] : "";
  }
  return fields;
}

/**
 * Locate the OTP verification form in a captured page.
 *
 * Returns the form's action URL, all of its input fields, and which
 * field should hold the OTP. `null` if no OTP-looking form exists.
 */
export function findOtpForm(
  html: string
): { action: string; fields: Record<string, string>; otpField: string } | null {
  const formRe = /<form\b[^>]*>([\s\S]*?)<\/form>/gi;
  let m: RegExpExecArray | null;
  let best: { action: string; fields: Record<string, string>; otpField: string } | null = null;
  let bestScore = -1;

  while ((m = formRe.exec(html)) !== null) {
    const formHtml = m[0];
    const actionMatch = formHtml.match(/action\s*=\s*"([^"]*)"/i);
    const action = actionMatch ? actionMatch[1] : "";

    const fields = extractFormFields(formHtml);
    // Candidate OTP fields: prefer names with "otp"/"verification";
    // fall back to a bare "code"-ish field that isn't the captcha.
    const otpField =
      Object.keys(fields).find(
        (k) =>
          /otp|verification/i.test(k) &&
          !/^user|pass|captcha|method|form/i.test(k)
      ) ??
      Object.keys(fields).find(
        (k) =>
          /^(code|txtcode|codes?|authcode|securitycode|otpcode)$/i.test(k) &&
          !/^user|pass|captcha|method|form/i.test(k)
      );
    if (!otpField) continue;

    // Prefer a form with an action endpoint AND an OTP-ish field.
    const score = (action.length > 0 ? 2 : 0) + 1;
    if (score > bestScore) {
      bestScore = score;
      best = { action, fields, otpField };
    }
  }

  return best;
}

/** Resolve a portal-relative action/href against the origin. */
export function resolvePortalUrl(path: string, origin: string, base: string): string {
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return origin + path;
  if (path.startsWith(";")) return base + path;
  return base + (path.startsWith("/") ? path : `/${path}`);
}
