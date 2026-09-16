export const APP_VERSION = "2.0.0";
export const TNC_STORAGE_KEY = "au75.tnc.accepted";

export function getAcceptedTnCVersion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TNC_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function hasAcceptedTnC(): boolean {
  return getAcceptedTnCVersion() === APP_VERSION;
}

export function acceptTnC(): void {
  try {
    window.localStorage.setItem(TNC_STORAGE_KEY, APP_VERSION);
  } catch {
    /* storage unavailable */
  }
}
