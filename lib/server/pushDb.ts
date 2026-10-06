// ============================================================
// Server-side Web Push Subscriptions & Scheduled Class Alerts Store
// Privacy-first: strictly stores anonymous class times, venues, and push endpoints.
// Uses Supabase when credentials exist; falls back to persistent local disk & memory store.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { isSupabaseConfigured } from "./maintenanceDb.ts";

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionDTO {
  endpoint: string;
  keys: PushSubscriptionKeys;
  expirationTime?: number | null;
}

export interface ScheduledPushAlert {
  id: string; // e.g. au75-class-YYYY-MM-DD-HH:MM-code-room
  endpoint: string;
  triggerAt: number; // Unix timestamp in ms
  title: string;
  body: string;
  tag: string;
  classDate?: string;
  formattedTime?: string;
  venue?: string;
  subjectName?: string;
  delivered: boolean;
  createdAt: string;
}

interface PushStoreFile {
  subscriptions: Record<string, { subscription: PushSubscriptionDTO; updatedAt: string }>;
  alerts: ScheduledPushAlert[];
}

// In-memory slot for thread safety & tests
const PUSH_STORE_SLOT = Symbol.for("au75.pushStore");

interface MemoryPushStore {
  subscriptions: Map<string, { subscription: PushSubscriptionDTO; updatedAt: string }>;
  alerts: Map<string, ScheduledPushAlert>;
}

function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    (Array.isArray(process.execArgv) && process.execArgv.includes("--test")) ||
    (Array.isArray(process.argv) && process.argv.some((arg) => arg.includes("test")))
  );
}

function getStoreFilePath(): string {
  const baseDir = path.join(process.cwd(), ".data");
  const fileName = isTestEnvironment() ? "push_test_store.json" : "push_store.json";
  return path.join(baseDir, fileName);
}

function loadStoreFromDisk(): PushStoreFile | null {
  try {
    const filePath = getStoreFilePath();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw.trim()) return null;
    return JSON.parse(raw) as PushStoreFile;
  } catch {
    return null;
  }
}

function saveStoreToDisk(mem: MemoryPushStore): void {
  try {
    const filePath = getStoreFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const fileData: PushStoreFile = {
      subscriptions: Object.fromEntries(mem.subscriptions.entries()),
      alerts: Array.from(mem.alerts.values()),
    };

    fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), "utf-8");
  } catch {
    // Ignore write errors in restricted environments
  }
}

function getMemoryStore(): MemoryPushStore {
  const g = globalThis as unknown as Record<symbol, MemoryPushStore | undefined>;
  if (!g[PUSH_STORE_SLOT]) {
    const fromDisk = loadStoreFromDisk();
    const store: MemoryPushStore = {
      subscriptions: new Map(),
      alerts: new Map(),
    };

    if (fromDisk) {
      if (fromDisk.subscriptions) {
        for (const [k, v] of Object.entries(fromDisk.subscriptions)) {
          store.subscriptions.set(k, v);
        }
      }
      if (Array.isArray(fromDisk.alerts)) {
        for (const a of fromDisk.alerts) {
          store.alerts.set(a.id, a);
        }
      }
    }

    g[PUSH_STORE_SLOT] = store;
  }
  return g[PUSH_STORE_SLOT]!;
}

/** Reset in-memory store and delete disk store (for tests) */
export function resetPushStore(): void {
  const mem = getMemoryStore();
  mem.subscriptions.clear();
  mem.alerts.clear();
  try {
    const filePath = getStoreFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}
}

/** Validate alert payload against privacy leaks */
export function validateAlertPrivacy(alert: Partial<ScheduledPushAlert>): boolean {
  const serialized = JSON.stringify(alert).toLowerCase();
  const forbidden = ["password", "usn", "token", "otp", "captcha", "studentid", "cookie"];
  for (const word of forbidden) {
    if (serialized.includes(word)) return false;
  }
  return true;
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

/** Save or update a client push subscription */
export async function savePushSubscription(subscription: PushSubscriptionDTO): Promise<void> {
  if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error("Invalid push subscription structure.");
  }

  const mem = getMemoryStore();
  const isoNow = new Date().toISOString();
  mem.subscriptions.set(subscription.endpoint, { subscription, updatedAt: isoNow });
  saveStoreToDisk(mem);

  // Sync to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        await fetch(`${supabaseUrl}/rest/v1/push_subscriptions`, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            subscription_json: subscription,
            updated_at: isoNow,
          }),
          cache: "no-store",
        });
      }
    } catch (e) {
      console.warn("[pushDb] Error saving push subscription to Supabase:", e);
    }
  }
}

/** Retrieve all active push subscriptions */
export async function getAllPushSubscriptions(): Promise<PushSubscriptionDTO[]> {
  const mem = getMemoryStore();
  const subs: PushSubscriptionDTO[] = [];
  for (const entry of mem.subscriptions.values()) {
    if (entry?.subscription?.endpoint) {
      subs.push(entry.subscription);
    }
  }
  return subs;
}

/** Remove an unsubscribed or expired push subscription and its alerts */
export async function removePushSubscription(endpoint: string): Promise<void> {
  if (!endpoint) return;

  const mem = getMemoryStore();
  mem.subscriptions.delete(endpoint);

  // Remove associated alerts
  for (const [id, alert] of mem.alerts.entries()) {
    if (alert.endpoint === endpoint) {
      mem.alerts.delete(id);
    }
  }
  saveStoreToDisk(mem);

  // Sync to Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        await fetch(
          `${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
          {
            method: "DELETE",
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
            cache: "no-store",
          }
        );
      }
    } catch (e) {
      console.warn("[pushDb] Error deleting push subscription from Supabase:", e);
    }
  }
}

/**
 * Synchronize the upcoming scheduled class alerts for a device.
 * Replaces any existing pending/undelivered alerts for this endpoint with the new set.
 */
export async function syncScheduledAlerts(
  endpoint: string,
  incomingAlerts: Array<Omit<ScheduledPushAlert, "endpoint" | "delivered" | "createdAt">>
): Promise<{ synced: number }> {
  if (!endpoint) {
    throw new Error("Missing endpoint for sync.");
  }

  const mem = getMemoryStore();
  const isoNow = new Date().toISOString();

  // Validate privacy & limit size
  const maxAlerts = 150;
  const filtered = incomingAlerts.slice(0, maxAlerts).filter((alert) => {
    return alert.id && alert.triggerAt && alert.title && alert.body && validateAlertPrivacy(alert);
  });

  // Remove existing pending alerts for this endpoint
  for (const [id, a] of mem.alerts.entries()) {
    if (a.endpoint === endpoint && !a.delivered) {
      mem.alerts.delete(id);
    }
  }

  // Insert updated alerts
  for (const a of filtered) {
    mem.alerts.set(a.id, {
      ...a,
      endpoint,
      delivered: false,
      createdAt: isoNow,
    });
  }

  saveStoreToDisk(mem);

  // Sync to Supabase if configured
  if (isSupabaseConfigured() && filtered.length > 0) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        // Delete pending alerts for this endpoint
        await fetch(
          `${supabaseUrl}/rest/v1/scheduled_push_alerts?endpoint=eq.${encodeURIComponent(endpoint)}&delivered=eq.false`,
          {
            method: "DELETE",
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
            cache: "no-store",
          }
        );

        // Upsert new alerts
        const rows = filtered.map((a) => ({
          id: a.id,
          endpoint,
          trigger_at: a.triggerAt,
          title: a.title,
          body: a.body,
          tag: a.tag || a.id,
          delivered: false,
          created_at: isoNow,
        }));

        await fetch(`${supabaseUrl}/rest/v1/scheduled_push_alerts`, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(rows),
          cache: "no-store",
        });
      }
    } catch (e) {
      console.warn("[pushDb] Error syncing alerts to Supabase:", e);
    }
  }

  return { synced: filtered.length };
}

/**
 * Retrieve all alerts currently due for dispatch.
 * Default lookback is 45 minutes to catch alerts due since the last cron run.
 */
export async function getDueAlerts(
  nowMs = Date.now(),
  lookbackMs = 45 * 60 * 1000
): Promise<Array<{ alert: ScheduledPushAlert; subscription: PushSubscriptionDTO }>> {
  const mem = getMemoryStore();
  const minTriggerTime = nowMs - lookbackMs;
  const results: Array<{ alert: ScheduledPushAlert; subscription: PushSubscriptionDTO }> = [];

  for (const alert of mem.alerts.values()) {
    if (!alert.delivered && alert.triggerAt <= nowMs && alert.triggerAt >= minTriggerTime) {
      const subEntry = mem.subscriptions.get(alert.endpoint);
      if (subEntry?.subscription) {
        results.push({
          alert,
          subscription: subEntry.subscription,
        });
      }
    }
  }

  return results;
}

/** Mark alerts as successfully dispatched */
export async function markAlertsDelivered(alertIds: string[]): Promise<void> {
  if (!alertIds || alertIds.length === 0) return;

  const mem = getMemoryStore();
  const idSet = new Set(alertIds);

  for (const id of alertIds) {
    const alert = mem.alerts.get(id);
    if (alert) {
      alert.delivered = true;
    }
  }

  saveStoreToDisk(mem);

  // Sync to Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        const inFilter = Array.from(idSet).map((id) => `"${id}"`).join(",");
        await fetch(
          `${supabaseUrl}/rest/v1/scheduled_push_alerts?id=in.(${inFilter})`,
          {
            method: "PATCH",
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ delivered: true }),
            cache: "no-store",
          }
        );
      }
    } catch (e) {
      console.warn("[pushDb] Error marking alerts delivered in Supabase:", e);
    }
  }
}

/** Clean up delivered alerts older than cutoff (default: 24 hours) */
export async function cleanupDeliveredAlerts(cutoffMs = 24 * 60 * 60 * 1000): Promise<number> {
  const mem = getMemoryStore();
  const threshold = Date.now() - cutoffMs;
  let count = 0;

  for (const [id, alert] of mem.alerts.entries()) {
    if (alert.delivered && alert.triggerAt < threshold) {
      mem.alerts.delete(id);
      count++;
    }
  }

  if (count > 0) {
    saveStoreToDisk(mem);
  }

  return count;
}
