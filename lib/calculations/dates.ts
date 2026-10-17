// Date/time helpers — pure, no React.

export function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "14:05" → "2:05 pm" */
export function fmtTime(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export function fmtRange(start?: string, end?: string): string {
  if (!start) return "";
  return end ? `${fmtTime(start)} – ${fmtTime(end)}` : fmtTime(start);
}

/** "2026-09-16" → "16 Sep" */
export function fmtDay(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function fmtWeekday(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short" });
}

export function fmtLong(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function fmtDateTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Minutes since midnight for "HH:MM". */
export function minutes(t: string): number {
  const parts = t.trim().split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Truncates instead of rounding: 74.6% must never display as "75%" (or
 * 74.96% as "75.0%") — that reads as meeting a 75% target when it doesn't.
 * The epsilon keeps float noise like 56.999…9 (= 57/100*100) at 57.
 */
export function fmtPct(value: number, decimals: boolean): string {
  return decimals
    ? (Math.floor(value * 10 + 1e-6) / 10).toFixed(1)
    : String(Math.floor(value + 1e-6));
}

/**
 * Determines whether a session is still in the future.
 * A session is considered ended/past if:
 * 1. Its date is before today's date, OR
 * 2. Its date is today, and the class end time (or start time + 55 min) has already passed.
 */
export function isSessionFuture(
  session: { date: string; startTime?: string; endTime?: string },
  now: Date = new Date()
): boolean {
  const today = todayISO(now);
  if (session.date < today) return false;
  if (session.date > today) return true;

  // Same day: check against current time
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (session.endTime) {
    return nowMin < minutes(session.endTime);
  }
  if (session.startTime) {
    return nowMin < minutes(session.startTime) + 55;
  }
  return true;
}

/** Local end time of a session (end time, else start + 55 min, else end of that day). */
export function sessionEnd(session: { date: string; startTime?: string; endTime?: string }): Date {
  const [y, mo, d] = session.date.split("-").map(Number);
  const endMin = session.endTime
    ? minutes(session.endTime)
    : session.startTime
      ? minutes(session.startTime) + 55
      : 24 * 60;
  return new Date(y, mo - 1, d, 0, endMin);
}
