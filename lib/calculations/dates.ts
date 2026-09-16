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
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function fmtPct(value: number, decimals: boolean): string {
  return decimals ? value.toFixed(1) : String(Math.round(value));
}
