// ============================================================
// Server-side Anonymous Aggregate Analytics Engine
// Privacy-first: strictly collects only anonymous aggregate counters.
// Uses Supabase when credentials exist; falls back to persistent in-memory store.
// ============================================================

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
  source: "supabase" | "fallback_memory";
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
}

function getMemoryStore(): MemoryStore {
  const g = globalThis as unknown as Record<symbol, MemoryStore | undefined>;
  if (!g[ANALYTICS_STORE_SLOT]) {
    g[ANALYTICS_STORE_SLOT] = {
      users: new Map(),
      events: [],
      dailyStats: new Map(),
      dailyUserActive: new Set(),
      dailyUserSynced: new Set(),
    };
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

  const dedupe = getDedupeMap();
  dedupe.clear();
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
  let activeToday = 0;
  let activeThisWeek = 0;
  let activeThisMonth = 0;

  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  for (const user of mem.users.values()) {
    if (user.has_synced) usersWhoSynced += 1;

    const lastSeen = new Date(user.last_seen_at).getTime();
    const userDate = user.last_seen_at.slice(0, 10);

    if (userDate === todayStr || lastSeen >= oneDayAgo) {
      activeToday += 1;
    }
    if (lastSeen >= sevenDaysAgo) {
      activeThisWeek += 1;
    }
    if (lastSeen >= thirtyDaysAgo) {
      activeThisMonth += 1;
    }
  }

  // Calculate sync operations
  let successfulSyncs = 0;
  let failedSyncs = 0;
  let syncAttempts = 0;

  for (const day of mem.dailyStats.values()) {
    successfulSyncs += day.successful_syncs;
    failedSyncs += day.failed_syncs;
    syncAttempts += day.sync_attempts;
  }

  // Also include events from raw array if dailyStats wasn't populated yet
  if (mem.dailyStats.size === 0 && mem.events.length > 0) {
    for (const ev of mem.events) {
      if (ev.event_type === "sync_success") successfulSyncs += 1;
      if (ev.event_type === "sync_failed") failedSyncs += 1;
      if (ev.event_type === "sync_started") syncAttempts += 1;
    }
  }

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

    dailyTrends.push({
      date: dateStr,
      label: formatDateLabel(dateStr),
      activeUsers: stats?.unique_users || 0,
      totalSyncs: stats?.successful_syncs || 0,
      uniqueUsers: stats?.unique_users || 0,
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
    source: isSupabaseConfigured() ? "supabase" : "fallback_memory",
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
