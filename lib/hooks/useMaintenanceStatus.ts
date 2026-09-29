"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export interface MaintenanceStatus {
  maintenanceMode: boolean;
  title: string;
  message: string;
  updatedAt: string | null;
  isLoading: boolean;
  isChecking: boolean;
  checkNow: () => Promise<void>;
}

const DEFAULT_TITLE = "AU75 is under maintenance";
const DEFAULT_MESSAGE = "We're making a few improvements. Please check back soon.";
const POLL_INTERVAL_MS = 10_000; // 10 seconds

export function useMaintenanceStatus(enabled = true): MaintenanceStatus {
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [title, setTitle] = useState<string>(DEFAULT_TITLE);
  const [message, setMessage] = useState<string>(DEFAULT_MESSAGE);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const lastStateRef = useRef(maintenanceMode);
  lastStateRef.current = maintenanceMode;

  const fetchStatus = useCallback(async (manual = false) => {
    // If browser is offline, don't poll or assume maintenance
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsChecking(false);
      }
      return;
    }

    if (manual) setIsChecking(true);

    try {
      const res = await fetch("/api/maintenance", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
        cache: "no-store",
      });

      if (!res.ok) {
        // If /api/maintenance temporarily fails, retain current known state
        console.warn(`[maintenance] /api/maintenance returned status ${res.status}`);
        return;
      }

      const data = await res.json();
      if (!isMountedRef.current) return;

      if (typeof data.maintenanceMode === "boolean") {
        setMaintenanceMode(data.maintenanceMode);
      }
      if (data.title) setTitle(data.title);
      if (data.message) setMessage(data.message);
      if (data.updatedAt) setUpdatedAt(data.updatedAt);
    } catch (err) {
      // Network or fetch error: Retain current state without blocking user
      console.warn("[maintenance] Polling error (retaining current state):", err);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // Initial check
    fetchStatus();

    // 10-second polling interval
    const interval = setInterval(() => {
      // Only poll when window/tab is visible to optimize battery/network
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      fetchStatus();
    }, POLL_INTERVAL_MS);

    // Also check when window regains focus or comes back online
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchStatus();
      }
    };
    const handleOnline = () => fetchStatus();

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
    };
  }, [enabled, fetchStatus]);

  const checkNow = useCallback(async () => {
    await fetchStatus(true);
  }, [fetchStatus]);

  return {
    maintenanceMode,
    title,
    message,
    updatedAt,
    isLoading,
    isChecking,
    checkNow,
  };
}
