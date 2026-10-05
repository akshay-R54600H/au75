// ============================================================
// Server-side In-Memory Rate Limiter for Analytics API
// Purely in-memory sliding window for abuse prevention.
// Never persists IP addresses or uses them as analytics identifiers.
// ============================================================

import type { NextRequest } from "next/server";

const RATE_LIMIT_MAP_SLOT = Symbol.for("au75.analyticsRateLimitMap");

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function getRateLimitMap(): Map<string, RateLimitEntry> {
  const g = globalThis as unknown as Record<symbol, Map<string, RateLimitEntry> | undefined>;
  if (!g[RATE_LIMIT_MAP_SLOT]) {
    g[RATE_LIMIT_MAP_SLOT] = new Map();
  }
  return g[RATE_LIMIT_MAP_SLOT]!;
}

// Limits
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests
const WINDOW_DURATION_MS = 60 * 1000; // 1 minute

/** Reset the rate limiter (useful for unit tests) */
export function resetAnalyticsRateLimit(): void {
  const map = getRateLimitMap();
  map.clear();
}

/** Extract client IP safely for temporary rate limiting without persisting it */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

/** Check if a request exceeds rate limits based on temporary IP and/or anonymous ID */
export function checkAnalyticsRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const map = getRateLimitMap();
  const entry = map.get(key);

  // Periodic cleanup if map grows large
  if (map.size > 5000) {
    for (const [k, v] of map.entries()) {
      if (now > v.resetAt) {
        map.delete(k);
      }
    }
  }

  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + WINDOW_DURATION_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true };
}
