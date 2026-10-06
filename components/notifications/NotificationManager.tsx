"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/context/AppContext";
import {
  generateSchedule,
  isNotificationSent,
  markNotificationSent,
} from "@/lib/notifications/scheduler";
import {
  showBrowserNotification,
  isNotificationSupported,
  getNotificationPermission,
} from "@/lib/notifications/manager";
import {
  syncDevicePushSchedule,
} from "@/lib/notifications/pushClient";
import { DEFAULT_NOTIFICATION_OFFSET_MINUTES } from "@/lib/notifications/types";

/**
 * Global background notification worker.
 * Checks upcoming classes based on local timetable and triggers notifications at the requested offset.
 * Synchronizes with Web Push worker to deliver notifications even when the app is completely closed.
 * Strictly non-intrusive: does NOT render unprompted popup banners or ask for permission repeatedly.
 * Completely disabled on administrative pages (/admin, /admin/...).
 */
export default function NotificationManager() {
  const pathname = usePathname();
  const isAdmin = Boolean(pathname?.startsWith("/admin"));

  const { state, isDemo } = useApp();
  const { sessions, subjects, academicDays, settings } = state;
  const notifications = settings.notifications;
  const isEnabled = notifications?.enabled ?? true;
  const offsetMinutes = notifications?.offsetMinutes ?? DEFAULT_NOTIFICATION_OFFSET_MINUTES;

  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    isNotificationSupported() ? getNotificationPermission() : "unsupported"
  );

  // Map to retain active scheduled exact timers: id -> { timeoutId, dueMs }
  const scheduledMapRef = useRef<Map<string, { timeoutId: NodeJS.Timeout; dueMs: number }>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Sync permission status (pure read-only listener, does NOT trigger prompts)
  useEffect(() => {
    if (isAdmin || !isNotificationSupported()) {
      setPermission("unsupported");
      return;
    }

    setPermission(getNotificationPermission());

    if (typeof navigator !== "undefined" && "permissions" in navigator && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((status) => {
          status.onchange = () => {
            setPermission(getNotificationPermission());
          };
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  // Synchronize upcoming schedule with background push worker
  useEffect(() => {
    if (isAdmin) return;
    // Only schedule push notifications for real synced student timetable, NEVER for demo data!
    if (permission === "granted" && isEnabled && !isDemo && sessions.length > 0) {
      syncDevicePushSchedule({
        sessions,
        subjects,
        academicDays,
        offsetMinutes,
      }).catch(() => {});
    } else if (!isEnabled || isDemo || sessions.length === 0) {
      // Clear push schedule so no stale or demo alerts trigger on the device
      syncDevicePushSchedule({
        sessions: [],
        subjects: [],
        academicDays,
        offsetMinutes,
      }).catch(() => {});
    }
  }, [isAdmin, permission, isEnabled, isDemo, sessions, subjects, academicDays, offsetMinutes]);

  // Main evaluation and dispatch function
  const checkAndDispatchDueNotifications = useCallback(async () => {
    if (isAdmin || typeof window === "undefined" || !isNotificationSupported()) return;
    if (Notification.permission !== "granted") return;
    // Do NOT notify for demo mock classes! Only notify for user's real synced timetable!
    if (isDemo || sessions.length === 0) return;

    const now = Date.now();
    // Look back 2 hours to catch any class currently starting or recently due
    const schedule = generateSchedule({
      sessions,
      subjects,
      academicDays,
      offsetMinutes,
      nowMs: now - 2 * 60 * 60 * 1000,
    });

    const activeMap = scheduledMapRef.current;

    for (const item of schedule) {
      // Calculate class start time
      const classStartMs = item.notificationTime + offsetMinutes * 60 * 1000;

      // Due if: now >= notificationTime AND class has not started more than 20 minutes ago
      const isPastNotificationTime = now >= item.notificationTime;
      const classNotExpired = now <= classStartMs + 20 * 60 * 1000;
      const isDueNow = isPastNotificationTime && classNotExpired;

      if (isDueNow) {
        if (!isNotificationSent(item.id)) {
          // Clear any pending timeout for this item
          const existing = activeMap.get(item.id);
          if (existing) {
            clearTimeout(existing.timeoutId);
            activeMap.delete(item.id);
          }

          markNotificationSent(item.id);

          await showBrowserNotification(item.title, {
            body: item.body,
            tag: item.id,
            requireInteraction: false,
          });
        }
      } else if (!isPastNotificationTime && !isNotificationSent(item.id)) {
        // Class notification is in the future.
        // If an exact timeout is already scheduled for this item with the same due time, keep it!
        const existing = activeMap.get(item.id);
        if (existing && existing.dueMs === item.notificationTime) {
          continue;
        }

        if (existing) {
          clearTimeout(existing.timeoutId);
          activeMap.delete(item.id);
        }

        const msUntilDue = item.notificationTime - now;
        // Schedule for any class due within the next 24 hours
        if (msUntilDue > 0 && msUntilDue <= 24 * 60 * 60 * 1000) {
          const timeoutId = setTimeout(async () => {
            activeMap.delete(item.id);
            if (Notification.permission === "granted" && !isNotificationSent(item.id)) {
              markNotificationSent(item.id);
              await showBrowserNotification(item.title, {
                body: item.body,
                tag: item.id,
                requireInteraction: false,
              });
            }
          }, msUntilDue);

          activeMap.set(item.id, { timeoutId, dueMs: item.notificationTime });
        }
      }
    }
  }, [isAdmin, isDemo, sessions, subjects, academicDays, offsetMinutes]);

  // Lifecycle effect: sets up timers and listeners
  useEffect(() => {
    // Clear previously scheduled timeouts when dependencies (offset/sessions) change or when in demo mode or admin
    for (const [, entry] of scheduledMapRef.current) {
      clearTimeout(entry.timeoutId);
    }
    scheduledMapRef.current.clear();

    if (
      isAdmin ||
      !isEnabled ||
      isDemo ||
      sessions.length === 0 ||
      typeof window === "undefined" ||
      permission !== "granted"
    ) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      return;
    }

    // Run immediate check
    checkAndDispatchDueNotifications();

    // Standard interval heartbeat (every 15 seconds)
    intervalRef.current = setInterval(checkAndDispatchDueNotifications, 15 * 1000);

    // Resilient Web Worker ticker to survive background tab throttling in Chromium/Edge
    try {
      const blob = new Blob(
        [
          `let timer = null;
           self.onmessage = function(e) {
             if (e.data === 'start') {
               if (!timer) timer = setInterval(function() { postMessage('tick'); }, 15000);
             } else if (e.data === 'stop') {
               if (timer) { clearInterval(timer); timer = null; }
             }
           };`,
        ],
        { type: "text/javascript" }
      );
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      worker.onmessage = () => {
        checkAndDispatchDueNotifications();
      };
      worker.postMessage("start");
      workerRef.current = worker;
    } catch {
      // Fall back gracefully to DOM timers
    }

    // Wakeup listeners: when tab is focused, un-minimized, or network reconnected
    const onWakeup = () => {
      checkAndDispatchDueNotifications();
    };

    window.addEventListener("visibilitychange", onWakeup);
    window.addEventListener("focus", onWakeup);
    window.addEventListener("online", onWakeup);
    window.addEventListener("pageshow", onWakeup);

    const activeScheduledMap = scheduledMapRef.current;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      for (const [, entry] of activeScheduledMap) {
        clearTimeout(entry.timeoutId);
      }
      activeScheduledMap.clear();

      window.removeEventListener("visibilitychange", onWakeup);
      window.removeEventListener("focus", onWakeup);
      window.removeEventListener("online", onWakeup);
      window.removeEventListener("pageshow", onWakeup);
    };
  }, [isAdmin, isEnabled, isDemo, offsetMinutes, sessions, subjects, academicDays, permission, checkAndDispatchDueNotifications]);

  // Non-intrusive background manager: renders no UI banners or unprompted popups
  return null;
}
