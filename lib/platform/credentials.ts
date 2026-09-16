// ============================================================
// Saved login (opt-in). Lets a later Sync skip straight to the
// CAPTCHA. Stored in localStorage on this device only — never sent
// anywhere except the portal itself during login.
// ============================================================

const QUICK_KEY = "au75.quickLogin";

export interface QuickLogin {
  studentId: string;
  password: string;
}

export function saveQuickLogin(studentId: string, password: string): void {
  try {
    localStorage.setItem(QUICK_KEY, JSON.stringify({ studentId, password }));
  } catch {
    /* private mode etc. */
  }
}

export function loadQuickLogin(): QuickLogin | null {
  try {
    const raw = localStorage.getItem(QUICK_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<QuickLogin>;
    return p.studentId && p.password ? { studentId: p.studentId, password: p.password } : null;
  } catch {
    return null;
  }
}

export function forgetSavedLogin(): void {
  try {
    localStorage.removeItem(QUICK_KEY);
    // legacy key from the Capacitor build
    localStorage.removeItem("CapacitorStorage.ap_quick_login");
  } catch {
    /* ignore */
  }
}
