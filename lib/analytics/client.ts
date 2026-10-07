// ============================================================
// AU75 Client-side Anonymous Analytics Helper
// Strictly privacy-preserving:
// - Generates a random anonymous installation UUID locally.
// - Transmits only predefined event types + anonymous UUID.
// - Never accesses or transmits student credentials, attendance, or PII.
// ============================================================

export type AnalyticsEventType =
  | "app_visit"
  | "sync_started"
  | "sync_success"
  | "sync_failed";

const STORAGE_KEY = "au75_anonymous_id";
const SESSION_VISIT_KEY = "au75_app_visit_recorded";

// UUID v4 format regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// In-memory session cache so an anonymous ID remains constant throughout the session
// even if localStorage is blocked, throws, or is in strict private mode
let cachedAnonymousId: string | null = null;
let appVisitTracked = false;

/** Generate a cryptographically random UUID v4 */
function generateRandomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback using crypto.getRandomValues if randomUUID is unavailable
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Pure random fallback (RFC4122 v4 compliant template)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retrieve or generate a persistent anonymous installation ID.
 * Multi-tiered storage with in-memory caching ensures that the same UUID is reused
 * for the entire browser session even if localStorage is restricted or disabled.
 */
export function getOrCreateAnonymousId(): string {
  if (cachedAnonymousId && UUID_REGEX.test(cachedAnonymousId)) {
    return cachedAnonymousId;
  }

  if (typeof window === "undefined") {
    return "";
  }

  // 1. Try localStorage
  try {
    if (window.localStorage) {
      const existing = window.localStorage.getItem(STORAGE_KEY);
      if (existing && UUID_REGEX.test(existing)) {
        cachedAnonymousId = existing;
        return existing;
      }
    }
  } catch {}

  // 2. Try sessionStorage fallback
  try {
    if (window.sessionStorage) {
      const sessExisting = window.sessionStorage.getItem(STORAGE_KEY);
      if (sessExisting && UUID_REGEX.test(sessExisting)) {
        cachedAnonymousId = sessExisting;
        return sessExisting;
      }
    }
  } catch {}

  // 3. Generate a new UUID and persist across available storages
  const newId = generateRandomUUID();
  cachedAnonymousId = newId;

  try {
    if (window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, newId);
    }
  } catch {}

  try {
    if (window.sessionStorage) {
      window.sessionStorage.setItem(STORAGE_KEY, newId);
    }
  } catch {}

  return newId;
}

/**
 * Send an anonymous analytics event to the server.
 * Completely fire-and-forget: never throws and never interferes with user flow.
 */
export async function trackEvent(eventType: AnalyticsEventType): Promise<void> {
  if (typeof window === "undefined") return;

  // Never track app visits from administrative routes
  if (
    eventType === "app_visit" &&
    typeof window.location?.pathname === "string" &&
    window.location.pathname.startsWith("/admin")
  ) {
    return;
  }

  try {
    const anonymousId = getOrCreateAnonymousId();
    if (!anonymousId) return;

    // Send only predefined event and anonymous ID. Absolutely no other payload.
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: eventType,
        anonymousId,
      }),
      keepalive: true,
      cache: "no-store",
    });
  } catch {
    // Silently ignore network failures to ensure student UX remains completely uninterrupted
  }
}

/**
 * Track an application visit once per browser session.
 * Automatically ignores admin dashboard routes.
 */
export function trackAppVisit(): void {
  if (typeof window === "undefined") return;

  // Ignore admin pages so administrative visits do not count as student app installations
  if (
    typeof window.location?.pathname === "string" &&
    window.location.pathname.startsWith("/admin")
  ) {
    return;
  }

  if (appVisitTracked) return;

  try {
    if (window.sessionStorage && window.sessionStorage.getItem(SESSION_VISIT_KEY)) {
      appVisitTracked = true;
      return;
    }
    if (window.sessionStorage) {
      window.sessionStorage.setItem(SESSION_VISIT_KEY, "1");
    }
  } catch {
    // Ignore storage issues
  }

  appVisitTracked = true;
  trackEvent("app_visit");
}
