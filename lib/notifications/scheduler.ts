// ============================================================
// AU75 Notification Scheduler
// Privacy-first, local-first schedule generation.
// Calculates class notification times using the locally-stored timetable.
// ============================================================

import type { ClassSession, AcademicDay } from "@/lib/models/types";
import {
  type NotificationOffsetMinutes,
  type ScheduledClassNotification,
  DEFAULT_NOTIFICATION_OFFSET_MINUTES,
} from "./types.ts";

const SENT_NOTIFICATIONS_KEY = "au75_sent_notification_ids";

/** Safely parse 24h or 12h time strings (e.g. "10:00", "09:30", "9:00 AM", "2:15 PM") */
export function parseTimeString(timeStr?: string): { hour: number; minute: number } | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minute = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3]?.toLowerCase();
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }
  const parts = trimmed.split(":");
  if (parts.length >= 2) {
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    if (!isNaN(hour) && !isNaN(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }
  return null;
}

/** Convert "HH:MM" (e.g. "10:00", "09:30", "14:15") into formatted 12-hour string (e.g. "10:00 AM", "9:30 AM", "2:15 PM") */
export function formatNotificationTime(timeStr?: string): string {
  if (!timeStr) return "";
  const parsed = parseTimeString(timeStr);
  if (!parsed) return timeStr;
  const hr = parsed.hour % 12 || 12;
  const ampm = parsed.hour < 12 ? "AM" : "PM";
  return `${hr}:${String(parsed.minute).padStart(2, "0")} ${ampm}`;
}

/** Generate deterministic non-sensitive notification identifier */
export function generateNotificationId(
  session: Pick<ClassSession, "date" | "startTime" | "subjectCode" | "subjectId" | "room">
): string {
  const code = (session.subjectCode || session.subjectId || "class").trim();
  const time = (session.startTime || "00:00").trim();
  const room = (session.room?.trim() || "venue").replace(/\s+/g, "_");
  return `au75-class-${session.date}-${time}-${code}-${room}`;
}

/** Calculate notification timestamp (ms) in user's local timezone */
export function calculateNotificationTime(
  sessionDate: string,
  startTime: string,
  offsetMinutes: NotificationOffsetMinutes = DEFAULT_NOTIFICATION_OFFSET_MINUTES
): number | null {
  if (!sessionDate || !startTime) return null;

  const dateParts = sessionDate.split("-").map(Number);
  if (dateParts.length !== 3) return null;
  const [year, month, day] = dateParts;

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }

  const parsedTime = parseTimeString(startTime);
  if (!parsedTime) return null;

  // Construct Date object in user's local timezone
  const classDate = new Date(year, month - 1, day, parsedTime.hour, parsedTime.minute, 0, 0);
  if (isNaN(classDate.getTime())) return null;

  return classDate.getTime() - offsetMinutes * 60 * 1000;
}

/** Build a single ScheduledClassNotification item from a ClassSession */
export function buildClassNotification(
  session: ClassSession,
  offsetMinutes: NotificationOffsetMinutes = DEFAULT_NOTIFICATION_OFFSET_MINUTES
): ScheduledClassNotification | null {
  if (!session.date || !session.startTime) return null;

  const notificationTime = calculateNotificationTime(session.date, session.startTime, offsetMinutes);
  if (notificationTime === null) return null;

  const venue = session.room?.trim() || "Venue unavailable";
  const formattedTime = formatNotificationTime(session.startTime);
  const id = generateNotificationId(session);

  return {
    id,
    sessionId: session.id,
    subjectName: session.subjectName,
    venue,
    startTime: session.startTime,
    formattedTime,
    classDate: session.date,
    notificationTime,
    title: "🔔 Upcoming Class",
    body: `${session.subjectName} is in ${venue}.\n\nStarts at ${formattedTime}.`,
  };
}

/**
 * Generate a sorted list of upcoming class notifications from the timetable.
 * Filters out:
 * - Holidays and academic breaks
 * - Past notifications
 * - Sessions without valid times
 * - Duplicate sessions
 */
export function generateSchedule(params: {
  sessions: ClassSession[];
  academicDays?: AcademicDay[];
  offsetMinutes?: NotificationOffsetMinutes;
  nowMs?: number;
}): ScheduledClassNotification[] {
  const {
    sessions,
    academicDays = [],
    offsetMinutes = DEFAULT_NOTIFICATION_OFFSET_MINUTES,
    nowMs = Date.now(),
  } = params;

  if (!sessions || sessions.length === 0) {
    return [];
  }

  // Build a Set of holiday & break dates to skip
  const holidayDates = new Set<string>();
  for (const day of academicDays) {
    if (day.type === "holiday" || day.type === "break") {
      holidayDates.add(day.date);
    }
  }

  const seenIds = new Set<string>();
  const schedule: ScheduledClassNotification[] = [];

  for (const session of sessions) {
    // 1. Skip holidays and breaks
    if (holidayDates.has(session.date)) continue;

    // 2. Build notification object
    const notif = buildClassNotification(session, offsetMinutes);
    if (!notif) continue;

    // 3. Skip past notifications
    if (notif.notificationTime <= nowMs) continue;

    // 4. De-duplicate multiple identical entries
    if (seenIds.has(notif.id)) continue;
    seenIds.add(notif.id);

    schedule.push(notif);
  }

  // Sort chronologically by notification trigger time
  schedule.sort((a, b) => a.notificationTime - b.notificationTime);

  return schedule;
}

/** Check whether a notification ID was already dispatched to the user */
export function isNotificationSent(id: string): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const raw = window.localStorage.getItem(SENT_NOTIFICATIONS_KEY);
    if (!raw) return false;
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) && ids.includes(id);
  } catch {
    return false;
  }
}

/** Mark a notification ID as dispatched */
export function markNotificationSent(id: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(SENT_NOTIFICATIONS_KEY);
    let ids: string[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) ids = parsed;
    }
    if (!ids.includes(id)) {
      ids.push(id);
      // Retain maximum last 200 IDs to prevent unbounded storage
      if (ids.length > 200) {
        ids = ids.slice(-150);
      }
      window.localStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify(ids));
    }
  } catch {
    // Ignore storage errors
  }
}

/** Clear sent notifications history (useful when rescheduling or testing) */
export function clearSentNotificationHistory(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(SENT_NOTIFICATIONS_KEY);
  } catch {
    // Ignore storage errors
  }
}
