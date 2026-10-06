// ============================================================
// Server-side Anonymous Aggregate Analytics Engine
// Privacy-first: strictly collects only anonymous aggregate counters.
// Uses Supabase when credentials exist; falls back to persistent local disk & memory store.
// ============================================================

import fs from "node:fs";
import path from "node:path";

export type AnalyticsEventType =
  | "app_visit"
  | "sync_started"
  | "sync_success"
  | "sync_failed";

export const ALLOWED_ANALYTICS_EVENTS: ReadonlySet<string> = new Set<AnalyticsEventType>([
  "app_visit",
  "sync_started",
  "sync_success",
  "sync_failed",
]);

export interface AnalyticsUserRecord {
  anonymous_id: string;
  first_seen_at: string;
  last_seen_at: string;
  has_synced: boolean;
  first_synced_at: string | null;
  sync_count: number;
}

export interface AnalyticsEventRecord {
  id?: number;
  anonymous_id: string;
  event_type: AnalyticsEventType;
  created_at: string;
}

export interface AnalyticsDailyStatsRecord {
  date: string; // YYYY-MM-DD
  unique_users: number;
  sync_users: number;
  successful_syncs: number;
  failed_syncs: number;
  sync_attempts: number;
  updated_at: string;
}

export interface DailyTrendPoint {
  date: string;
  label: string;
  activeUsers: number;
  totalSyncs: number;
  uniqueUsers: number;
  successfulSyncs: number;
}

export interface AnalyticsAggregateDTO {
  totalUsers: number;
  usersWhoSynced: number;
  totalSyncs: number;
  activeToday: number;
  activeThisWeek: number;
  activeThisMonth: number;
  syncAttempts: number;
  successfulSyncs: number;
  failedSyncs: number;
  syncSuccessRate: number;
  dailyTrends: DailyTrendPoint[];
  source: "supabase" | "local_disk" | "fallback_memory";
  lastUpdated: string;
}

// In-memory persistent state (persists across Next.js API reloads in globalThis)
const ANALYTICS_STORE_SLOT = Symbol.for("au75.analyticsStore");
const DEDUPE_SLOT = Symbol.for("au75.analyticsDedupe");

interface MemoryStore {
  users: Map<string, AnalyticsUserRecord>;
  events: AnalyticsEventRecord[];
  dailyStats: Map<string, AnalyticsDailyStatsRecord>;
  dailyUserActive: Set<string>; // "${date}:${anonymous_id}"
  dailyUserSynced: Set<string>; // "${date}:${anonymous_id}"
  lastLoadedMtime?: number;
}

interface DiskPayload {
  users?: Array<[string, AnalyticsUserRecord]>;
  events?: AnalyticsEventRecord[];
  dailyStats?: Array<[string, AnalyticsDailyStatsRecord]>;
  dailyUserActive?: string[];
  dailyUserSynced?: string[];
  savedAt?: string;
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
  const fileName = isTestEnvironment() ? "analytics_test_store.json" : "analytics_store.json";
  return path.join(baseDir, fileName);
}

let diskWriteSupported = true;

/**
 * Merges raw payload into target MemoryStore without losing existing records.
 * Solves multi-process desynchronization and data loss across Next.js workers.
 */
function mergePayloadIntoStore(target: MemoryStore, data: DiskPayload): void {
  if (Array.isArray(data.users)) {
    for (const [id, user] of data.users) {
      if (!id || !user) continue;
      const existing = target.users.get(id);
      if (!existing) {
        target.users.set(id, { ...user });
      } else {
        // Retain earliest first_seen_at
        if (new Date(user.first_seen_at).getTime() < new Date(existing.first_seen_at).getTime()) {
          existing.first_seen_at = user.first_seen_at;
        }
        // Retain latest last_seen_at
        if (new Date(user.last_seen_at).getTime() > new Date(existing.last_seen_at).getTime()) {
          existing.last_seen_at = user.last_seen_at;
        }
        existing.has_synced = Boolean(existing.has_synced || user.has_synced);
        if (user.first_synced_at) {
          if (
            !existing.first_synced_at ||
            new Date(user.first_synced_at).getTime() < new Date(existing.first_synced_at).getTime()
          ) {
            existing.first_synced_at = user.first_synced_at;
          }
        }
        existing.sync_count = Math.max(existing.sync_count || 0, user.sync_count || 0);
      }
    }
  }

  if (Array.isArray(data.events)) {
    const existingKeys = new Set(
      target.events.map((e) => `${e.created_at}:${e.anonymous_id}:${e.event_type}`)
    );
    for (const ev of data.events) {
      const key = `${ev.created_at}:${ev.anonymous_id}:${ev.event_type}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        target.events.push(ev);
      }
    }
    target.events.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    if (target.events.length > 500) {
      target.events = target.events.slice(-500);
    }
  }

  if (Array.isArray(data.dailyUserActive)) {
    for (const item of data.dailyUserActive) {
      target.dailyUserActive.add(item);
    }
  }

  if (Array.isArray(data.dailyUserSynced)) {
    for (const item of data.dailyUserSynced) {
      target.dailyUserSynced.add(item);
    }
  }

  if (Array.isArray(data.dailyStats)) {
    for (const [date, stat] of data.dailyStats) {
      if (!date || !stat) continue;
      const existing = target.dailyStats.get(date);
      if (!existing) {
        target.dailyStats.set(date, { ...stat });
      } else {
        existing.unique_users = Math.max(existing.unique_users || 0, stat.unique_users || 0);
        existing.sync_users = Math.max(existing.sync_users || 0, stat.sync_users || 0);
        existing.successful_syncs = Math.max(existing.successful_syncs || 0, stat.successful_syncs || 0);
        existing.failed_syncs = Math.max(existing.failed_syncs || 0, stat.failed_syncs || 0);
        existing.sync_attempts = Math.max(existing.sync_attempts || 0, stat.sync_attempts || 0);
        if (new Date(stat.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
          existing.updated_at = stat.updated_at;
        }
      }
    }
  }
}

/** Synchronize memory store with latest state on disk if modified */
function syncStoreWithDisk(store: MemoryStore): void {
  try {
    const filePath = getStoreFilePath();
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    if (store.lastLoadedMtime && stat.mtimeMs <= store.lastLoadedMtime) {
      return;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw.trim()) return;
    const data = JSON.parse(raw) as DiskPayload;
    mergePayloadIntoStore(store, data);
    store.lastLoadedMtime = stat.mtimeMs;
  } catch {
    // Non-fatal, preserve current in-memory data
  }
}

function saveStoreToDisk(store: MemoryStore): void {
  try {
    const filePath = getStoreFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Merge latest disk state first so parallel worker writes are unioned
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        if (raw.trim()) {
          const diskData = JSON.parse(raw) as DiskPayload;
          mergePayloadIntoStore(store, diskData);
        }
      } catch {}
    }

    const payload: DiskPayload = {
      users: Array.from(store.users.entries()),
      events: store.events,
      dailyStats: Array.from(store.dailyStats.entries()),
      dailyUserActive: Array.from(store.dailyUserActive),
      dailyUserSynced: Array.from(store.dailyUserSynced),
      savedAt: new Date().toISOString(),
    };

    const serialized = JSON.stringify(payload, null, 2);

    // Safe write: write to temp file then rename or direct write with retry
    const tempFile = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
      fs.writeFileSync(tempFile, serialized, "utf-8");
      try {
        fs.renameSync(tempFile, filePath);
      } catch {
        fs.writeFileSync(filePath, serialized, "utf-8");
        try { fs.unlinkSync(tempFile); } catch {}
      }
    } catch {
      fs.writeFileSync(filePath, serialized, "utf-8");
    }

    try {
      store.lastLoadedMtime = fs.statSync(filePath).mtimeMs;
    } catch {
      store.lastLoadedMtime = Date.now();
    }
    diskWriteSupported = true;
  } catch (err) {
    console.warn("[analyticsDb] Failed to save store to disk:", err);
  }
}

export function isDiskPersisted(): boolean {
  return diskWriteSupported && !isTestEnvironment();
}

function getMemoryStore(): MemoryStore {
  const g = globalThis as unknown as Record<symbol, MemoryStore | undefined>;
  if (!g[ANALYTICS_STORE_SLOT]) {
    const store: MemoryStore = {
      users: new Map(),
      events: [],
      dailyStats: new Map(),
      dailyUserActive: new Set(),
      dailyUserSynced: new Set(),
      lastLoadedMtime: 0,
    };
    syncStoreWithDisk(store);
    g[ANALYTICS_STORE_SLOT] = store;
  } else {
    // Keep in sync with disk across multiple Next.js worker processes
    syncStoreWithDisk(g[ANALYTICS_STORE_SLOT]!);
  }
  return g[ANALYTICS_STORE_SLOT]!;
}

function getDedupeMap(): Map<string, number> {
  const g = globalThis as unknown as Record<symbol, Map<string, number> | undefined>;
  if (!g[DEDUPE_SLOT]) {
    g[DEDUPE_SLOT] = new Map();
  }
  return g[DEDUPE_SLOT]!;
}

/** Check if Supabase credentials are configured in server environment. */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Reset in-memory analytics store (for testing). */
export function resetAnalyticsStore(): void {
  const store = getMemoryStore();
  store.users.clear();
  store.events.length = 0;
  store.dailyStats.clear();
  store.dailyUserActive.clear();
  store.dailyUserSynced.clear();
  store.lastLoadedMtime = 0;

  const dedupe = getDedupeMap();
  dedupe.clear();

  try {
    const filePath = getStoreFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}
}

/** Helper to get YYYY-MM-DD in UTC */
export function getUtcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Helper to format date label (e.g. "Oct 1") */
export function formatDateLabel(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  } catch {
    return dateStr;
  }
}

// Event deduplication cooldowns (milliseconds)
const DEDUPE_COOLDOWNS: Record<AnalyticsEventType, number> = {
  app_visit: 60 * 1000,      // 60 seconds
  sync_started: 3 * 1000,     // 3 seconds
  sync_success: 10 * 1000,    // 10 seconds
  sync_failed: 3 * 1000,      // 3 seconds
};

/**
 * Record an anonymous analytics event.
 * Validates anonymity, performs deduplication, and records aggregate stats.
 */
export async function recordAnalyticsEvent(params: {
  eventType: AnalyticsEventType;
  anonymousId: string;
}): Promise<{ ok: boolean; deduplicated?: boolean; isNewUser?: boolean }> {
  const { eventType, anonymousId } = params;

  if (!ALLOWED_ANALYTICS_EVENTS.has(eventType)) {
    throw new Error(`Invalid event type: ${eventType}`);
  }

  // Deduplication check
  const now = Date.now();
  const dedupeKey = `${anonymousId}:${eventType}`;
  const dedupeMap = getDedupeMap();
  const lastTime = dedupeMap.get(dedupeKey);
  const cooldown = DEDUPE_COOLDOWNS[eventType] || 5000;

  if (lastTime && now - lastTime < cooldown) {
    return { ok: true, deduplicated: true };
  }
  dedupeMap.set(dedupeKey, now);

  // Periodically clean up dedupe map
  if (dedupeMap.size > 2000) {
    for (const [k, timestamp] of dedupeMap.entries()) {
      if (now - timestamp > 5 * 60 * 1000) {
        dedupeMap.delete(k);
      }
    }
  }

  const isoNow = new Date(now).toISOString();
  const todayStr = getUtcDateString(new Date(now));

  // 1. Update in-memory fallback store
  const mem = getMemoryStore();
  let isNewUser = false;

  let user = mem.users.get(anonymousId);
  if (!user) {
    isNewUser = true;
    user = {
      anonymous_id: anonymousId,
      first_seen_at: isoNow,
      last_seen_at: isoNow,
      has_synced: eventType === "sync_success",
      first_synced_at: eventType === "sync_success" ? isoNow : null,
      sync_count: eventType === "sync_success" ? 1 : 0,
    };
    mem.users.set(anonymousId, user);
  } else {
    user.last_seen_at = isoNow;
    if (eventType === "sync_success") {
      user.has_synced = true;
      user.first_synced_at = user.first_synced_at || isoNow;
      user.sync_count += 1;
    }
  }

  // Record raw event
  mem.events.push({
    anonymous_id: anonymousId,
    event_type: eventType,
    created_at: isoNow,
  });

  // Prune raw events older than 30 days
  const thirtyDaysAgoMs = now - 30 * 24 * 60 * 60 * 1000;
  if (mem.events.length > 500 && new Date(mem.events[0].created_at).getTime() < thirtyDaysAgoMs) {
    mem.events = mem.events.filter(
      (e) => new Date(e.created_at).getTime() >= thirtyDaysAgoMs
    );
  }

  // Update daily stats in memory
  let daily = mem.dailyStats.get(todayStr);
  if (!daily) {
    daily = {
      date: todayStr,
      unique_users: 0,
      sync_users: 0,
      successful_syncs: 0,
      failed_syncs: 0,
      sync_attempts: 0,
      updated_at: isoNow,
    };
    mem.dailyStats.set(todayStr, daily);
  }

  const activeKey = `${todayStr}:${anonymousId}`;
  if (!mem.dailyUserActive.has(activeKey)) {
    mem.dailyUserActive.add(activeKey);
    daily.unique_users += 1;
  }

  if (eventType === "sync_started") {
    daily.sync_attempts += 1;
  } else if (eventType === "sync_success") {
    daily.successful_syncs += 1;
    const syncedKey = `${todayStr}:${anonymousId}`;
    if (!mem.dailyUserSynced.has(syncedKey)) {
      mem.dailyUserSynced.add(syncedKey);
      daily.sync_users += 1;
    }
  } else if (eventType === "sync_failed") {
    daily.failed_syncs += 1;
  }
  daily.updated_at = isoNow;

  // Persist updated in-memory store to local disk
  saveStoreToDisk(mem);

  // 2. Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await persistEventToSupabase({
        anonymousId,
        eventType,
        isoNow,
        todayStr,
        isNewUser,
        user,
      });
    } catch (err) {
      console.warn("[analyticsDb] Failed to persist event to Supabase. Fallback in-memory active:", err);
    }
  }

  return { ok: true, isNewUser };
}

/** Helper to persist event, user, and daily stats to Supabase REST */
async function persistEventToSupabase(params: {
  anonymousId: string;
  eventType: AnalyticsEventType;
  isoNow: string;
  todayStr: string;
  isNewUser: boolean;
  user: AnalyticsUserRecord;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  // 1. Insert raw event into app_analytics_events
  await fetch(`${supabaseUrl}/rest/v1/app_analytics_events`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      anonymous_id: params.anonymousId,
      event_type: params.eventType,
      created_at: params.isoNow,
    }),
    cache: "no-store",
  }).catch((e) => console.error("[analyticsDb] Error inserting raw event:", e));

  // 2. Upsert user into app_analytics_users
  await fetch(`${supabaseUrl}/rest/v1/app_analytics_users`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      anonymous_id: params.anonymousId,
      first_seen_at: params.user.first_seen_at,
      last_seen_at: params.isoNow,
      has_synced: params.user.has_synced,
      first_synced_at: params.user.first_synced_at,
      sync_count: params.user.sync_count,
    }),
    cache: "no-store",
  }).catch((e) => console.error("[analyticsDb] Error upserting user:", e));
}

/**
 * Retrieve anonymous aggregate analytics.
 * Returns only anonymous totals and trends.
 */
export async function getAggregateAnalytics(): Promise<AnalyticsAggregateDTO> {
  const mem = getMemoryStore();
  const now = Date.now();
  const isoNow = new Date(now).toISOString();
  const todayStr = getUtcDateString(new Date(now));

  // Try to query Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const remoteData = await fetchAggregatesFromSupabase();
      if (remoteData) {
        return remoteData;
      }
    } catch (err) {
      console.warn("[analyticsDb] Failed to fetch aggregate stats from Supabase. Falling back to memory store:", err);
    }
  }

  // In-memory calculations
  const totalUsers = mem.users.size;
  let usersWhoSynced = 0;
  let totalSuccessfulSyncsFromUsers = 0;

  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const activeTodaySet = new Set<string>();
  const activeWeekSet = new Set<string>();
  const activeMonthSet = new Set<string>();

  // Process daily active entries
  for (const entry of mem.dailyUserActive) {
    const colonIdx = entry.indexOf(":");
    if (colonIdx === -1) continue;
    const dateStr = entry.slice(0, colonIdx);
    const userId = entry.slice(colonIdx + 1);

    if (dateStr === todayStr) {
      activeTodaySet.add(userId);
    }
    const dTime = new Date(`${dateStr}T00:00:00Z`).getTime();
    if (dTime >= sevenDaysAgo) {
      activeWeekSet.add(userId);
    }
    if (dTime >= thirtyDaysAgo) {
      activeMonthSet.add(userId);
    }
  }

  for (const user of mem.users.values()) {
    if (user.has_synced) usersWhoSynced += 1;
    totalSuccessfulSyncsFromUsers += user.sync_count || 0;

    const lastSeen = new Date(user.last_seen_at).getTime();
    const userDate = user.last_seen_at.slice(0, 10);

    if (userDate === todayStr || lastSeen >= oneDayAgo) {
      activeTodaySet.add(user.anonymous_id);
    }
    if (lastSeen >= sevenDaysAgo) {
      activeWeekSet.add(user.anonymous_id);
    }
    if (lastSeen >= thirtyDaysAgo) {
      activeMonthSet.add(user.anonymous_id);
    }
  }

  const activeToday = activeTodaySet.size;
  const activeThisWeek = activeWeekSet.size;
  const activeThisMonth = activeMonthSet.size;

  // Calculate sync operations
  let successfulSyncs = 0;
  let failedSyncs = 0;
  let syncAttempts = 0;

  for (const day of mem.dailyStats.values()) {
    successfulSyncs += day.successful_syncs || 0;
    failedSyncs += day.failed_syncs || 0;
    syncAttempts += day.sync_attempts || 0;
  }

  // Also include events from raw array if dailyStats wasn't populated yet
  if (mem.dailyStats.size === 0 && mem.events.length > 0) {
    for (const ev of mem.events) {
      if (ev.event_type === "sync_success") successfulSyncs += 1;
      if (ev.event_type === "sync_failed") failedSyncs += 1;
      if (ev.event_type === "sync_started") syncAttempts += 1;
    }
  }

  successfulSyncs = Math.max(successfulSyncs, totalSuccessfulSyncsFromUsers);
  const effectiveAttempts = Math.max(syncAttempts, successfulSyncs + failedSyncs);
  const syncSuccessRate =
    effectiveAttempts > 0
      ? Number(((successfulSyncs / effectiveAttempts) * 100).toFixed(1))
      : 0;

  // Build daily trends for the last 14 days
  const dailyTrends: DailyTrendPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr = getUtcDateString(d);
    const stats = mem.dailyStats.get(dateStr);

    let dayActiveCount = stats?.unique_users || 0;
    let countFromSet = 0;
    for (const entry of mem.dailyUserActive) {
      if (entry.startsWith(`${dateStr}:`)) countFromSet++;
    }
    dayActiveCount = Math.max(dayActiveCount, countFromSet);
    if (dateStr === todayStr) {
      dayActiveCount = Math.max(dayActiveCount, activeToday);
    }

    let newUsersCount = 0;
    for (const u of mem.users.values()) {
      if (u.first_seen_at.slice(0, 10) === dateStr) {
        newUsersCount++;
      }
    }

    dailyTrends.push({
      date: dateStr,
      label: formatDateLabel(dateStr),
      activeUsers: dayActiveCount,
      totalSyncs: stats?.successful_syncs || 0,
      uniqueUsers: newUsersCount > 0 ? newUsersCount : dayActiveCount,
      successfulSyncs: stats?.successful_syncs || 0,
    });
  }

  return {
    totalUsers,
    usersWhoSynced,
    totalSyncs: successfulSyncs,
    activeToday,
    activeThisWeek,
    activeThisMonth,
    syncAttempts: effectiveAttempts,
    successfulSyncs,
    failedSyncs,
    syncSuccessRate,
    dailyTrends,
    source: isSupabaseConfigured() ? "supabase" : isDiskPersisted() ? "local_disk" : "fallback_memory",
    lastUpdated: isoNow,
  };
}

/** Query aggregate numbers from Supabase */
async function fetchAggregatesFromSupabase(): Promise<AnalyticsAggregateDTO | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  const now = Date.now();
  const isoNow = new Date(now).toISOString();
  const todayStartIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgoIso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgoIso = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgoDate = getUtcDateString(new Date(now - 14 * 24 * 60 * 60 * 1000));

  // Run queries in parallel
  const [
    totalUsersRes,
    syncedUsersRes,
    activeTodayRes,
    activeWeekRes,
    activeMonthRes,
    dailyStatsRes,
    eventsRes,
  ] = await Promise.all([
    // Total users
    fetch(`${supabaseUrl}/rest/v1/app_analytics_users?select=count`, {
      method: "HEAD",
      headers: { ...headers, Prefer: "count=exact" },
      cache: "no-store",
    }),
    // Users who synced
    fetch(`${supabaseUrl}/rest/v1/app_analytics_users?has_synced=eq.true&select=count`, {
      method: "HEAD",
      headers: { ...headers, Prefer: "count=exact" },
      cache: "no-store",
    }),
    // Active today (seen in past 24h)
    fetch(`${supabaseUrl}/rest/v1/app_analytics_users?last_seen_at=gte.${todayStartIso}&select=count`, {
      method: "HEAD",
      headers: { ...headers, Prefer: "count=exact" },
      cache: "no-store",
    }),
    // Active week (seen in past 7d)
    fetch(`${supabaseUrl}/rest/v1/app_analytics_users?last_seen_at=gte.${sevenDaysAgoIso}&select=count`, {
      method: "HEAD",
      headers: { ...headers, Prefer: "count=exact" },
      cache: "no-store",
    }),
    // Active month (seen in past 30d)
    fetch(`${supabaseUrl}/rest/v1/app_analytics_users?last_seen_at=gte.${thirtyDaysAgoIso}&select=count`, {
      method: "HEAD",
      headers: { ...headers, Prefer: "count=exact" },
      cache: "no-store",
    }),
    // Daily stats records for trends
    fetch(`${supabaseUrl}/rest/v1/app_analytics_daily_stats?date=gte.${fourteenDaysAgoDate}&order=date.asc`, {
      method: "GET",
      headers,
      cache: "no-store",
    }),
    // Recent events count for sync counts
    fetch(`${supabaseUrl}/rest/v1/app_analytics_events?select=event_type`, {
      method: "GET",
      headers,
      cache: "no-store",
    }),
  ]);

  const parseCount = (res: Response): number => {
    const range = res.headers.get("content-range");
    if (!range) return 0;
    const match = range.match(/\/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const totalUsers = parseCount(totalUsersRes);
  const usersWhoSynced = parseCount(syncedUsersRes);
  const activeToday = parseCount(activeTodayRes);
  const activeThisWeek = parseCount(activeWeekRes);
  const activeThisMonth = parseCount(activeMonthRes);

  let successfulSyncs = 0;
  let failedSyncs = 0;
  let syncAttempts = 0;

  if (eventsRes.ok) {
    const events = (await eventsRes.json()) as Array<{ event_type: AnalyticsEventType }>;
    for (const ev of events) {
      if (ev.event_type === "sync_success") successfulSyncs += 1;
      else if (ev.event_type === "sync_failed") failedSyncs += 1;
      else if (ev.event_type === "sync_started") syncAttempts += 1;
    }
  }

  const effectiveAttempts = Math.max(syncAttempts, successfulSyncs + failedSyncs);
  const syncSuccessRate =
    effectiveAttempts > 0
      ? Number(((successfulSyncs / effectiveAttempts) * 100).toFixed(1))
      : 0;

  // Build daily trends map
  const statsMap = new Map<string, { uniqueUsers: number; successfulSyncs: number }>();
  if (dailyStatsRes.ok) {
    const statsRows = (await dailyStatsRes.json()) as AnalyticsDailyStatsRecord[];
    for (const row of statsRows) {
      statsMap.set(row.date, {
        uniqueUsers: row.unique_users,
        successfulSyncs: row.successful_syncs,
      });
    }
  }

  const dailyTrends: DailyTrendPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr = getUtcDateString(d);
    const item = statsMap.get(dateStr);

    dailyTrends.push({
      date: dateStr,
      label: formatDateLabel(dateStr),
      activeUsers: item?.uniqueUsers || 0,
      totalSyncs: item?.successfulSyncs || 0,
      uniqueUsers: item?.uniqueUsers || 0,
      successfulSyncs: item?.successfulSyncs || 0,
    });
  }

  return {
    totalUsers,
    usersWhoSynced,
    totalSyncs: successfulSyncs,
    activeToday,
    activeThisWeek,
    activeThisMonth,
    syncAttempts: effectiveAttempts,
    successfulSyncs,
    failedSyncs,
    syncSuccessRate,
    dailyTrends,
    source: "supabase",
    lastUpdated: isoNow,
  };
}
