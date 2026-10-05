"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/lib/context/AppContext";
import {
  generateSchedule,
  isNotificationSent,
  markNotificationSent,
} from "@/lib/notifications/scheduler";
import {
  showBrowserNotification,
  requestNotificationPermission,
  isNotificationSupported,
} from "@/lib/notifications/manager";
import { DEFAULT_NOTIFICATION_OFFSET_MINUTES } from "@/lib/notifications/types";

/**
 * Global background notification worker.
 * Checks upcoming classes based on local timetable and triggers notifications at the requested offset.
 */
export default function NotificationManager() {
  const { state } = useApp();
  const { sessions, academicDays, settings } = state;
  const notifications = settings.notifications;
  const isEnabled = notifications?.enabled ?? true;
  const offsetMinutes = notifications?.offsetMinutes ?? DEFAULT_NOTIFICATION_OFFSET_MINUTES;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const scheduledTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Automatically prompt for notification permission on first user gesture if notifications are enabled
  useEffect(() => {
    if (typeof window === "undefined" || !isNotificationSupported()) return;

    if (isEnabled && Notification.permission === "default") {
      const requestOnGesture = async () => {
        try {
          await requestNotificationPermission();
        } catch {}
      };

      window.addEventListener("click", requestOnGesture, { once: true });
      window.addEventListener("touchstart", requestOnGesture, { once: true });
      window.addEventListener("keydown", requestOnGesture, { once: true });

      return () => {
        window.removeEventListener("click", requestOnGesture);
        window.removeEventListener("touchstart", requestOnGesture);
        window.removeEventListener("keydown", requestOnGesture);
      };
    }
  }, [isEnabled]);

  useEffect(() => {
    // Clear previous scheduled exact timeouts
    for (const timeout of scheduledTimeoutsRef.current) {
      clearTimeout(timeout);
    }
    scheduledTimeoutsRef.current = [];

    if (!isEnabled || typeof window === "undefined") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkAndDispatchDueNotifications = async () => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

      const now = Date.now();
      // Generate upcoming schedule for the next 48 hours, looking back 24 hours
      const schedule = generateSchedule({
        sessions,
        academicDays,
        offsetMinutes,
        nowMs: now - 24 * 60 * 60 * 1000,
      });

      // Clear pending exact timeouts before re-evaluating
      for (const timeout of scheduledTimeoutsRef.current) {
        clearTimeout(timeout);
      }
      scheduledTimeoutsRef.current = [];

      for (const item of schedule) {
        // Calculate class start time
        const classStartMs = item.notificationTime + offsetMinutes * 60 * 1000;

        // Is this notification currently due?
        // Due if: now >= notificationTime AND class has not finished / started more than 5 minutes ago
        const isPastNotificationTime = now >= item.notificationTime;
        const classNotExpired = now <= classStartMs + 5 * 60 * 1000;
        const isDueNow = isPastNotificationTime && classNotExpired;

        if (isDueNow && !isNotificationSent(item.id)) {
          markNotificationSent(item.id);

          await showBrowserNotification(item.title, {
            body: item.body,
            tag: item.id,
            requireInteraction: false,
          });
        } else if (!isPastNotificationTime && classNotExpired && !isNotificationSent(item.id)) {
          // Schedule an exact setTimeout for notifications due within next 4 hours
          const msUntilDue = item.notificationTime - now;
          if (msUntilDue > 0 && msUntilDue <= 4 * 60 * 60 * 1000) {
            const timeoutId = setTimeout(async () => {
              if (Notification.permission === "granted" && !isNotificationSent(item.id)) {
                markNotificationSent(item.id);
                await showBrowserNotification(item.title, {
                  body: item.body,
                  tag: item.id,
                  requireInteraction: false,
                });
              }
            }, msUntilDue);
            scheduledTimeoutsRef.current.push(timeoutId);
          }
        }
      }
    };

    // Run initial check
    checkAndDispatchDueNotifications();

    // Check periodically every 20 seconds
    intervalRef.current = setInterval(checkAndDispatchDueNotifications, 20 * 1000);

    // Also check on visibilitychange / focus
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndDispatchDueNotifications();
      }
    };
    window.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      for (const timeout of scheduledTimeoutsRef.current) {
        clearTimeout(timeout);
      }
      scheduledTimeoutsRef.current = [];
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
  }, [isEnabled, offsetMinutes, sessions, academicDays]);

  return null;
}
