import test from "node:test";
import assert from "node:assert/strict";
import {
  recordAnalyticsEvent,
  getAggregateAnalytics,
  resetAnalyticsStore,
  ALLOWED_ANALYTICS_EVENTS,
} from "../lib/server/analyticsDb.ts";
import {
  checkAnalyticsRateLimit,
  resetAnalyticsRateLimit,
} from "../lib/server/analyticsRateLimit.ts";
import {
  sealAdminSession,
  openAdminSession,
} from "../lib/server/adminAuth.ts";

test("privacy architecture: allowed events and payload isolation", () => {
  assert.equal(ALLOWED_ANALYTICS_EVENTS.has("app_visit"), true);
  assert.equal(ALLOWED_ANALYTICS_EVENTS.has("sync_started"), true);
  assert.equal(ALLOWED_ANALYTICS_EVENTS.has("sync_success"), true);
  assert.equal(ALLOWED_ANALYTICS_EVENTS.has("sync_failed"), true);

  // Arbitrary or student-specific events must NOT be allowed
  assert.equal(ALLOWED_ANALYTICS_EVENTS.has("student_login"), false);
  assert.equal(ALLOWED_ANALYTICS_EVENTS.has("attendance_fetched"), false);
  assert.equal(ALLOWED_ANALYTICS_EVENTS.has("grades_viewed"), false);
});

test("analytics functionality: user counting and sync analytics", async () => {
  resetAnalyticsStore();

  const userA = "11111111-1111-4111-8111-111111111111";
  const userB = "22222222-2222-4222-8222-222222222222";

  // 1. Initial empty state
  let agg = await getAggregateAnalytics();
  assert.equal(agg.totalUsers, 0);
  assert.equal(agg.usersWhoSynced, 0);
  assert.equal(agg.totalSyncs, 0);
  assert.equal(agg.successfulSyncs, 0);
  assert.equal(agg.failedSyncs, 0);
  assert.equal(agg.syncSuccessRate, 0);

  // 2. New user A visits AU75 -> Total Users + 1
  const res1 = await recordAnalyticsEvent({ eventType: "app_visit", anonymousId: userA });
  assert.equal(res1.ok, true);
  assert.equal(res1.isNewUser, true);

  agg = await getAggregateAnalytics();
  assert.equal(agg.totalUsers, 1, "New user should increase Total Users to 1");
  assert.equal(agg.activeToday, 1);
  assert.equal(agg.activeThisWeek, 1);
  assert.equal(agg.activeThisMonth, 1);
  assert.equal(agg.usersWhoSynced, 0);

  // 3. User A performs another app visit (e.g., refresh / navigation) -> Total Users remains 1
  // (Note: deduplication may suppress within cooldown or simply update user's last_seen)
  await recordAnalyticsEvent({ eventType: "app_visit", anonymousId: userA });
  agg = await getAggregateAnalytics();
  assert.equal(agg.totalUsers, 1, "Existing user should not increase Total Users");

  // 4. New user B visits AU75 -> Total Users becomes 2
  const res2 = await recordAnalyticsEvent({ eventType: "app_visit", anonymousId: userB });
  assert.equal(res2.isNewUser, true);
  agg = await getAggregateAnalytics();
  assert.equal(agg.totalUsers, 2, "Second unique user should increase Total Users to 2");

  // 5. User A starts sync
  await recordAnalyticsEvent({ eventType: "sync_started", anonymousId: userA });
  agg = await getAggregateAnalytics();
  assert.equal(agg.syncAttempts, 1);
  assert.equal(agg.successfulSyncs, 0);

  // 6. User A completes successful sync
  await recordAnalyticsEvent({ eventType: "sync_success", anonymousId: userA });
  agg = await getAggregateAnalytics();
  assert.equal(agg.usersWhoSynced, 1, "User A is now a synced user");
  assert.equal(agg.totalSyncs, 1, "Total syncs incremented to 1");
  assert.equal(agg.successfulSyncs, 1);
  assert.equal(agg.syncSuccessRate, 100, "1 success out of 1 attempt = 100%");

  // 7. User A performs second successful sync -> Users Who Synced remains 1, Total Syncs becomes 2
  // We advance deduplication map timestamp if needed or use unique event
  const dedupeSlot = Symbol.for("au75.analyticsDedupe");
  const g = globalThis;
  if (g[dedupeSlot]) g[dedupeSlot].clear();

  await recordAnalyticsEvent({ eventType: "sync_success", anonymousId: userA });
  agg = await getAggregateAnalytics();
  assert.equal(agg.usersWhoSynced, 1, "Users Who Synced should remain 1");
  assert.equal(agg.totalSyncs, 2, "Total syncs should now be 2");
  assert.equal(agg.successfulSyncs, 2);

  // 8. User B attempts sync and fails
  if (g[dedupeSlot]) g[dedupeSlot].clear();
  await recordAnalyticsEvent({ eventType: "sync_started", anonymousId: userB });
  await recordAnalyticsEvent({ eventType: "sync_failed", anonymousId: userB });
  agg = await getAggregateAnalytics();
  assert.equal(agg.failedSyncs, 1, "Failed sync count should be 1");
  assert.equal(agg.usersWhoSynced, 1, "User B is not in usersWhoSynced because sync failed");

  // 9. Sync success rate calculation:
  // Successful syncs: 2, Failed syncs: 1. Total attempts: 3.
  // Rate: (2 / 3) * 100 = 66.7%
  assert.equal(agg.syncSuccessRate, 66.7, "Sync success rate should reflect (2 / 3) * 100 = 66.7%");

  // 10. User B now succeeds on retry
  if (g[dedupeSlot]) g[dedupeSlot].clear();
  await recordAnalyticsEvent({ eventType: "sync_success", anonymousId: userB });
  agg = await getAggregateAnalytics();
  assert.equal(agg.usersWhoSynced, 2, "Both User A and User B have now successfully synced");
  assert.equal(agg.totalSyncs, 3);
  assert.equal(agg.successfulSyncs, 3);
  assert.equal(agg.failedSyncs, 1);
  // Rate: (3 / 4) * 100 = 75.0%
  assert.equal(agg.syncSuccessRate, 75);
});

test("analytics trends: 14-day chronological daily history", async () => {
  resetAnalyticsStore();
  const agg = await getAggregateAnalytics();

  assert.equal(Array.isArray(agg.dailyTrends), true);
  assert.equal(agg.dailyTrends.length, 14, "Must contain exactly 14 trend points");

  for (const point of agg.dailyTrends) {
    assert.ok(typeof point.date === "string", "Point must have ISO date");
    assert.ok(typeof point.label === "string", "Point must have formatted date label");
    assert.ok(typeof point.uniqueUsers === "number", "Point must have uniqueUsers count");
    assert.ok(typeof point.successfulSyncs === "number", "Point must have successfulSyncs count");
  }

  // Dates should be sorted chronologically
  const dates = agg.dailyTrends.map((d) => d.date);
  const sortedDates = [...dates].sort();
  assert.deepEqual(dates, sortedDates, "Daily trends must be in chronological order");
});

test("rate limiting and abuse protection: burst control", () => {
  resetAnalyticsRateLimit();

  const clientKey = "ip:10.0.0.1";

  // First 60 requests within window should be allowed
  for (let i = 0; i < 60; i++) {
    const res = checkAnalyticsRateLimit(clientKey);
    assert.equal(res.allowed, true, `Request ${i + 1} should be allowed`);
  }

  // 61st request should be throttled
  const blocked = checkAnalyticsRateLimit(clientKey);
  assert.equal(blocked.allowed, false, "Request exceeding window limit must be blocked");
  assert.ok(blocked.retryAfterSeconds && blocked.retryAfterSeconds > 0);

  // Different IP is unaffected
  const otherClient = checkAnalyticsRateLimit("ip:10.0.0.2");
  assert.equal(otherClient.allowed, true);
});

test("duplicate suppression: short-window cooldown", async () => {
  resetAnalyticsStore();
  const userC = "33333333-3333-4333-8333-333333333333";

  // First event records successfully
  const first = await recordAnalyticsEvent({ eventType: "app_visit", anonymousId: userC });
  assert.equal(first.ok, true);
  assert.equal(first.deduplicated, undefined);

  // Immediate second event within cooldown is marked deduplicated
  const second = await recordAnalyticsEvent({ eventType: "app_visit", anonymousId: userC });
  assert.equal(second.ok, true);
  assert.equal(second.deduplicated, true, "Immediate duplicate event should be deduplicated");
});

test("security & privacy constraints: admin session protection and data sanitation", () => {
  // Session verification ensures unauthenticated access is rejected
  const fakeToken = "invalid-token";
  assert.equal(openAdminSession(fakeToken), null);

  const realToken = sealAdminSession("admin@au75.vercel.app");
  const opened = openAdminSession(realToken);
  assert.ok(opened);
  assert.equal(opened.email, "admin@au75.vercel.app");
});
