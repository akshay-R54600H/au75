// Light haptic tick for touch interactions (Android/Chrome; a no-op where
// the Vibration API is missing, e.g. iOS Safari).

export function haptic(ms = 8): void {
  try {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate(ms);
  } catch {
    /* blocked by permissions policy etc. */
  }
}
