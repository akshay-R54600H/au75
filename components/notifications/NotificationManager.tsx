"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, CheckCircle2, X } from "lucide-react";
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
  getNotificationPermission,
} from "@/lib/notifications/manager";
import { DEFAULT_NOTIFICATION_OFFSET_MINUTES } from "@/lib/notifications/types";

/**
 * Global background notification worker.
 * Checks upcoming classes based on local timetable and triggers notifications at the requested offset.
 * Includes background worker ticker and interactive permission prompt.
 */
export default function NotificationManager() {
  const { state } = useApp();
  const { sessions, academicDays, settings } = state;
  const notifications = settings.notifications;
  const isEnabled = notifications?.enabled ?? true;
  const offsetMinutes = notifications?.offsetMinutes ?? DEFAULT_NOTIFICATION_OFFSET_MINUTES;

  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    isNotificationSupported() ? getNotificationPermission() : "unsupported"
  );
  const [dismissedBanner, setDismissedBanner] = useState(false);

  // Map to retain active scheduled exact timers: id -> { timeoutId, dueMs }
  const scheduledMapRef = useRef<Map<string, { timeoutId: NodeJS.Timeout; dueMs: number }>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Sync permission status
  useEffect(() => {
    if (!isNotificationSupported()) {
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
  }, []);

  const handleRequestPermission = useCallback(async () => {
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);
    } catch {}
  }, []);

  // Main evaluation and dispatch function
  const checkAndDispatchDueNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !isNotificationSupported()) return;
    if (Notification.permission !== "granted") return;

    const now = Date.now();
    // Look back 2 hours to catch any class currently starting or recently due
    const schedule = generateSchedule({
      sessions,
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
  }, [sessions, academicDays, offsetMinutes]);

  // Lifecycle effect: sets up timers and listeners
  useEffect(() => {
    // Clear previously scheduled timeouts when dependencies (offset/sessions) change
    for (const [, entry] of scheduledMapRef.current) {
      clearTimeout(entry.timeoutId);
    }
    scheduledMapRef.current.clear();

    if (!isEnabled || typeof window === "undefined" || permission !== "granted") {
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

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      for (const [, entry] of scheduledMapRef.current) {
        clearTimeout(entry.timeoutId);
      }
      scheduledMapRef.current.clear();

      window.removeEventListener("visibilitychange", onWakeup);
      window.removeEventListener("focus", onWakeup);
      window.removeEventListener("online", onWakeup);
      window.removeEventListener("pageshow", onWakeup);
    };
  }, [isEnabled, offsetMinutes, sessions, academicDays, permission, checkAndDispatchDueNotifications]);

  // If notifications are enabled but permission is not yet granted, render an actionable banner
  if (!isEnabled || permission !== "default" || dismissedBanner) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Notification Permission"
      className="fixed bottom-16 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 rounded-2xl border-2 border-marker bg-surface p-4 shadow-xl animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-marker/15 text-marker">
          <Bell size={20} className="animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-ink">Turn on class notifications</h4>
          <p className="mt-0.5 text-xs text-muted leading-relaxed">
            Get an automatic reminder on your device {offsetMinutes} minutes before each class starts.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleRequestPermission}
              className="inline-flex items-center gap-1.5 rounded-xl bg-marker px-3.5 py-1.5 text-xs font-bold text-paper shadow-sm hover:opacity-95 transition"
            >
              <CheckCircle2 size={14} />
              <span>Allow Notifications</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissedBanner(true)}
              className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-ink hover:bg-line transition"
            >
              Later
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissedBanner(true)}
          aria-label="Close notification banner"
          className="rounded-lg p-1 text-faint hover:text-ink hover:bg-line transition"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
