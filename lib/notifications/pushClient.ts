// ============================================================
// Client-side Web Push Manager
// Registers Service Worker Push Subscriptions and synchronizes
// upcoming timetable alerts with the background delivery worker.
// ============================================================

import type { ClassSession, AcademicDay } from "@/lib/models/types";
import { type NotificationOffsetMinutes, DEFAULT_NOTIFICATION_OFFSET_MINUTES } from "./types";
import { generateSchedule } from "./scheduler";

/** Convert a URL-safe Base64 string to a Uint8Array for applicationServerKey */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Check if Web Push is supported on this browser/device */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Fetch existing active PushSubscription, if any */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Fetch server VAPID public key */
export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/notifications/vapid-public-key");
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey || null;
  } catch {
    return null;
  }
}

/**
 * Subscribe the current browser to Web Push notifications.
 * Requests browser permission if not yet granted.
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  if (Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return null;
  }

  const vapidKey = await fetchVapidPublicKey();
  if (!vapidKey) return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
      });
    }

    return sub;
  } catch (err) {
    console.warn("[pushClient] Failed to subscribe to pushManager:", err);
    return null;
  }
}

/**
 * Synchronize upcoming timetable notifications with the background push worker.
 * Allows notifications to trigger automatically even when the app is completely closed.
 */
export async function syncDevicePushSchedule(params: {
  sessions: ClassSession[];
  academicDays?: AcademicDay[];
  offsetMinutes?: NotificationOffsetMinutes;
}): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission !== "granted") return false;

  const {
    sessions,
    academicDays = [],
    offsetMinutes = DEFAULT_NOTIFICATION_OFFSET_MINUTES,
  } = params;

  try {
    let sub = await getExistingPushSubscription();
    if (!sub) {
      sub = await subscribeToPushNotifications();
    }
    if (!sub) return false;

    // Calculate schedule for upcoming 14 days
    const now = Date.now();
    const fullSchedule = generateSchedule({
      sessions,
      academicDays,
      offsetMinutes,
      nowMs: now,
    });

    // Map to safe alert payloads (strictly class info, zero student credentials)
    const alerts = fullSchedule.map((item) => ({
      id: item.id,
      triggerAt: item.notificationTime,
      title: item.title,
      body: item.body,
      tag: item.id,
      classDate: item.classDate,
      formattedTime: item.formattedTime,
      venue: item.venue,
      subjectName: item.subjectName,
    }));

    const response = await fetch("/api/notifications/sync-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        alerts,
      }),
    });

    return response.ok;
  } catch (err) {
    console.warn("[pushClient] Error synchronizing push schedule:", err);
    return false;
  }
}

/** Unsubscribe current browser from background notifications */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushSupported()) return true;

  try {
    const sub = await getExistingPushSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});

      await sub.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
}

/** Trigger an immediate test push to verify the background push worker pipeline */
export async function sendTestPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    let sub = await getExistingPushSubscription();
    if (!sub) {
      sub = await subscribeToPushNotifications();
    }
    if (!sub) return false;

    const res = await fetch("/api/notifications/test-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });

    return res.ok;
  } catch {
    return false;
  }
}
