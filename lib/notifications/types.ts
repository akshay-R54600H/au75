// ============================================================
// AU75 Notification System Data Models & Types
// ============================================================

export type NotificationOffsetMinutes = 5 | 10 | 15 | 30;

export const DEFAULT_NOTIFICATION_OFFSET_MINUTES: NotificationOffsetMinutes = 5;

export const NOTIFICATION_OFFSET_OPTIONS: ReadonlyArray<{
  value: NotificationOffsetMinutes;
  label: string;
}> = [
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
] as const;

export interface NotificationSettings {
  enabled: boolean; // default: true (ON by default for every device)
  offsetMinutes: NotificationOffsetMinutes; // default: 5 (5 minutes before class)
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  offsetMinutes: DEFAULT_NOTIFICATION_OFFSET_MINUTES,
};

export interface ScheduledClassNotification {
  id: string; // Unique deterministic ID: au75-class-YYYY-MM-DD-HH:MM-subjectCode-room
  sessionId: string;
  subjectName: string;
  venue: string;
  startTime: string; // "10:00"
  formattedTime: string; // "10:00 AM"
  classDate: string; // "2026-10-06"
  notificationTime: number; // Unix timestamp in milliseconds when notification should fire
  title: string; // "🔔 Upcoming Class"
  body: string; // "[Subject] is in [Venue].\n\nStarts at [Time]."
}
