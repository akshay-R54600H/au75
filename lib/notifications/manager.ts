// ============================================================
// AU75 Notification Manager
// Browser capability detection, permission handling, and notification delivery.
// ============================================================

import {
  type NotificationSettings,
  DEFAULT_NOTIFICATION_OFFSET_MINUTES,
} from "./types.ts";
import type { ClassSession, Subject } from "@/lib/models/types";
import { todayISO } from "@/lib/calculations/dates";
import { formatNotificationTime } from "./scheduler";

const SETTINGS_STORAGE_KEY = "au75_notification_settings";

/** Check if Web Notifications are supported in the current environment */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Get current notification permission status */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/** Request notification permission from user */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Display a browser notification using Service Worker registration where available,
 * or falling back to the standard Web Notification API.
 */
export async function showBrowserNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  const defaultOptions: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    icon: "/icon.svg",
    badge: "/icon.svg",
    vibrate: [200, 100, 200],
    renotify: true,
    ...options,
  };

  // 1. Try Service Worker registration (most reliable across mobile Android & desktop PWA)
  if ("serviceWorker" in navigator) {
    try {
      let reg: ServiceWorkerRegistration | null | undefined = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 300)),
      ]);
      if (!reg) {
        reg = await navigator.serviceWorker.getRegistration();
      }
      if (reg && typeof reg.showNotification === "function") {
        await reg.showNotification(title, defaultOptions);
        return true;
      }
    } catch {
      // Fallback below
    }
  }

  // 2. Direct Window Notification fallback (works reliably in desktop browsers)
  try {
    if (typeof Notification !== "undefined") {
      const notif = new Notification(title, defaultOptions);
      setTimeout(() => {
        try {
          notif.close();
        } catch {}
      }, 10000);
      return true;
    }
  } catch {
    // If Notification constructor threw (e.g., Android Chrome requires SW), continue to step 3
  }

  // 3. Fallback: on-demand Service Worker registration if needed
  if ("serviceWorker" in navigator && "register" in navigator.serviceWorker) {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      if (reg && typeof reg.showNotification === "function") {
        await reg.showNotification(title, defaultOptions);
        return true;
      }
    } catch {
      // Failed all dispatch mechanisms
    }
  }

  return false;
}

/**
 * Send the test notification:
 * Title: "🔔 AU75 Notifications"
 * Body: "Class notifications are working correctly."
 * Triggers direct browser notification and background Web Push if supported.
 */
export async function sendTestNotification(): Promise<boolean> {
  const localSuccess = await showBrowserNotification("🔔 AU75 Notifications", {
    body: "Class notifications are working correctly.",
    tag: "au75-test-notification",
  });

  // Also trigger background push in the background if supported
  try {
    const { isPushSupported, sendTestPush } = await import("./pushClient");
    if (isPushSupported()) {
      sendTestPush().catch(() => {});
    }
  } catch {}

  return localSuccess;
}

/**
 * Dispatch an immediate notification for today's present class from the student's timetable.
 * Uses the student's actual enrolled classes to avoid alerting classes not in their timetable.
 */
export async function sendTodayClassAlert(
  userSessions?: ClassSession[],
  userSubjects?: Subject[]
): Promise<boolean> {
  const today = todayISO();
  let title = "🔔 Class Notification";
  let body = "No classes scheduled for today in your timetable.";

  // If student sessions are provided, evaluate strictly from the student's own timetable
  if (userSessions && userSessions.length > 0) {
    let candidateSessions = userSessions.filter((s) => s.date === today);

    // Filter against enrolled subjects if provided
    if (userSubjects && userSubjects.length > 0) {
      const validCodes = new Set(
        userSubjects.map((s) => s.code.trim().toUpperCase().replace(/\s+/g, ""))
      );
      const validIds = new Set(userSubjects.map((s) => s.id.trim().toLowerCase()));
      const validNames = new Set(
        userSubjects.map((s) => s.name.trim().toLowerCase().replace(/\s+/g, " "))
      );

      candidateSessions = candidateSessions.filter((session) => {
        const code = (session.subjectCode || "").trim().toUpperCase().replace(/\s+/g, "");
        const id = (session.subjectId || "").trim().toLowerCase();
        const name = (session.subjectName || "").trim().toLowerCase().replace(/\s+/g, " ");
        return (
          (code && validCodes.has(code)) ||
          (id && (validIds.has(id) || validIds.has(`portal-${id}`))) ||
          (name && validNames.has(name))
        );
      });
    }

    if (candidateSessions.length > 0) {
      candidateSessions.sort((a, b) =>
        (a.startTime || "00:00").localeCompare(b.startTime || "00:00")
      );
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Find active class or next upcoming class today
      const current =
        candidateSessions.find((s) => {
          if (!s.startTime) return false;
          const [sh, sm] = s.startTime.split(":").map(Number);
          const [eh, em] = (s.endTime || s.startTime).split(":").map(Number);
          const startMin = sh * 60 + sm;
          const endMin = (eh * 60 + em) || (startMin + 55);
          return currentMinutes >= startMin && currentMinutes <= endMin;
        }) ||
        candidateSessions.find((s) => {
          if (!s.startTime) return false;
          const [sh, sm] = s.startTime.split(":").map(Number);
          return sh * 60 + sm > currentMinutes;
        }) ||
        candidateSessions[0];

      if (current) {
        title = `🔔 ${current.subjectName}`;
        const currentIndex = candidateSessions.indexOf(current);
        const next = candidateSessions[currentIndex + 1];
        const nextPart = next
          ? ` Next: ${next.subjectName} in ${next.room || "Venue unavailable"} (${formatNotificationTime(next.startTime)}).`
          : "";
        const formattedStart = formatNotificationTime(current.startTime);
        body = `${current.subjectName} in ${current.room || "Venue unavailable"} (${formattedStart}).${nextPart}`;
      }
    }
  } else {
    // Fallback only if no sessions are loaded into memory
    try {
      const res = await fetch("/api/portal/present-timetable");
      if (res.ok) {
        const data = await res.json();
        const current = data.activeOrNext;
        if (current) {
          title = `🔔 ${current.name}`;
          const next = data.classes?.find((c: { slot: number }) => c.slot > current.slot);
          const nextPart = next ? ` Next: ${next.name} in ${next.room} (${next.startTime}).` : "";
          body = `${current.name} in ${current.room} (${current.time}).${nextPart}`;
        }
      }
    } catch {}
  }

  const localSuccess = await showBrowserNotification(title, {
    body,
    tag: "au75-today-class-alert",
  });

  return localSuccess;
}

/** Load notification settings from localStorage */
export function loadNotificationSettings(): NotificationSettings {
  const fallback: NotificationSettings = {
    enabled: true,
    offsetMinutes: DEFAULT_NOTIFICATION_OFFSET_MINUTES, // 5 minutes default
  };

  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled !== undefined ? Boolean(parsed.enabled) : true,
      offsetMinutes: [5, 10, 15, 30].includes(parsed.offsetMinutes)
        ? parsed.offsetMinutes
        : DEFAULT_NOTIFICATION_OFFSET_MINUTES,
    };
  } catch {
    return fallback;
  }
}

/** Save notification settings to localStorage */
export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}
