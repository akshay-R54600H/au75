// ============================================================
// Alliance University Portal — Authentication
//
// CONFIRMED from probe + captures:
//
// Login URL:   POST https://student.alliance.edu.in/auerp/StudentLoginAction.do
// Fields:      method=studentLoginAction
//              formName=loginform
//              pageType=2
//              userName=<email or ID>
//              password=<password>
//              captcha=<OCR text>
//              serverDownMessage=
//              errorMessage=
//
// Session:     JSESSIONID cookie + ;jsessionid= URL path rewriting
// CAPTCHA:     Image at /auerp/Captcha.jpg (fresh per session)
// OTP:         Sent via email/SMS after successful captcha+creds
//              User must enter it manually in the browser
//
// Flow confirmed:
//   1. GET /StudentLogin.do          → login page + session cookie
//   2. GET /Captcha.jpg              → captcha image (binary)
//   3. POST /StudentLoginAction.do   → if correct: OTP page
//   4. User enters OTP in browser    → authenticated
//   5. GET data pages with same session
//
// Architecture decision:
//   The OTP step requires a human, so the sync must happen inside
//   the browser/WebView where the user logs in themselves.
//   The parsers here are called client-side after the user
//   confirms they have logged in.
// ============================================================

export const PORTAL_ORIGIN = "https://student.alliance.edu.in";
export const PORTAL_BASE = `${PORTAL_ORIGIN}/auerp`;
export const PORTAL_LOGIN_URL = `${PORTAL_BASE}/StudentLogin.do`;
export const PORTAL_LOGIN_ACTION = `${PORTAL_BASE}/StudentLoginAction.do`;

export const PORTAL_ATTENDANCE_URL = `${PORTAL_BASE}/studentWiseAttendanceSummary.do?method=getIndividualStudentWiseSubjectAndActivityAttendanceSummary`;
export const PORTAL_TIMETABLE_URL = `${PORTAL_BASE}/viewMyTimeTable.do?method=initViewStudentTimeTable`;

// Form field names (confirmed from captured HTML)
export const LOGIN_FIELDS = {
  method: "studentLoginAction",
  formName: "loginform",
  pageType: "2",
  serverDownMessage: "",
  errorMessage: "",
  // user supplies: userName, password, captcha
} as const;

export type PortalPageKind =
  | "login"         // login page (not authenticated)
  | "otp"           // OTP entry page
  | "dashboard"     // logged in dashboard
  | "data"          // data page (attendance/timetable)
  | "captcha-error" // captcha wrong, still on login page
  | "unknown";

/**
 * Classify a portal HTML response.
 * Confirmed from probe captures.
 */
export function classifyPortalPage(html: string): PortalPageKind {
  const lower = html.toLowerCase();

  // Captcha-specific error on login page
  if (/captcha is required/i.test(html)) return "captcha-error";

  // Login page markers
  if (
    /name="loginform"|captchaid|studentlogin\.do/i.test(html) &&
    /student login/i.test(html)
  ) {
    return "login";
  }

  // OTP page (probe confirmed it reached this)
  if (/(otp|one.?time.?password|verification.?code|enter.?the.?code)/i.test(lower)) {
    return "otp";
  }

  // Authenticated dashboard markers
  if (/(logout|welcome|student home|my account|dashboard)/i.test(lower)) {
    return "dashboard";
  }

  // Data pages (attendance/timetable content)
  if (
    /attendance|timetable|time.?table|subject.*attended|total.*classes/i.test(lower)
  ) {
    return "data";
  }

  return "unknown";
}

/**
 * Opens the portal login page in a new browser tab.
 * On mobile (Capacitor) this uses the system browser.
 * The user must log in, complete CAPTCHA, complete OTP.
 * Then return to the app and press Sync.
 */
export function openPortalInBrowser(): void {
  if (typeof window !== "undefined") {
    window.open(PORTAL_LOGIN_URL, "_blank", "noopener,noreferrer");
  }
}
