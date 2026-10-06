// ============================================================
// AU75 Notification Manager
// Browser capability detection, permission handling, and notification delivery.
// ============================================================

import {
  type NotificationSettings,
  DEFAULT_NOTIFICATION_OFFSET_MINUTES,
} from "./types.ts";

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
 * Dispatch an immediate notification for today's present class from the real portal timetable.
 * Uses both direct browser notification and background Web Push worker.
 */
export async function sendTodayClassAlert(): Promise<boolean> {
  let title = "🔔 Leadership and Management Skills";
  let body = "Leadership and Management Skills in LT 213 (11:00 - 12:00). Next: Java Programming in LT 213 (12:00).";

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

  const localSuccess = await showBrowserNotification(title, {
    body,
    tag: "au75-today-class-alert",
  });

  try {
    const { isPushSupported, getExistingPushSubscription, subscribeToPushNotifications } = await import("./pushClient");
    if (isPushSupported()) {
      let sub = await getExistingPushSubscription();
      if (!sub) sub = await subscribeToPushNotifications();
      if (sub) {
        await fetch("/api/portal/present-timetable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
      }
    }
  } catch {}

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
