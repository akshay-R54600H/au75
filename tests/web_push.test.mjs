import test from "node:test";
import assert from "node:assert/strict";
import {
  getVapidKeys,
  initWebPush,
  resetVapidCache,
} from "../lib/server/pushConfig.ts";
import {
  savePushSubscription,
  removePushSubscription,
  syncScheduledAlerts,
  getDueAlerts,
  markAlertsDelivered,
  cleanupDeliveredAlerts,
  resetPushStore,
  validateAlertPrivacy,
} from "../lib/server/pushDb.ts";

test.beforeEach(() => {
  resetVapidCache();
  resetPushStore();
});

test("Push Test 1 — VAPID key generation and initialization", () => {
  const keys = getVapidKeys();
  assert.ok(keys.publicKey, "Must have public key");
  assert.ok(keys.privateKey, "Must have private key");
  assert.equal(typeof keys.publicKey, "string");
  assert.equal(typeof keys.privateKey, "string");
  assert.ok(keys.publicKey.length > 20, "Public key must be valid base64url string");

  // initWebPush should not throw
  assert.doesNotThrow(() => initWebPush());
});

test("Push Test 2 — Privacy validation rejects sensitive student data", () => {
  const safeAlert = {
    id: "au75-class-1",
    title: "🔔 Upcoming Class",
    body: "Python Programming in Room 201.\nStarts at 10:00 AM.",
  };
  assert.equal(validateAlertPrivacy(safeAlert), true, "Normal class info must pass privacy check");

  const alertWithPassword = {
    id: "bad-1",
    title: "Class",
    body: "Student password123",
  };
  assert.equal(validateAlertPrivacy(alertWithPassword), false, "Password must be rejected");

  const alertWithUSN = {
    id: "bad-2",
    title: "Class",
    body: "USN: 1MS21CS001 in attendance",
  };
  assert.equal(validateAlertPrivacy(alertWithUSN), false, "USN must be rejected");

  const alertWithToken = {
    id: "bad-3",
    title: "Class",
    body: "Session token abc",
  };
  assert.equal(validateAlertPrivacy(alertWithToken), false, "Token must be rejected");
});

test("Push Test 3 — Subscription registration and schedule sync", async () => {
  const testSub = {
    endpoint: "https://fcm.googleapis.com/fcm/send/test-device-1",
    keys: {
      p256dh: "BMh3gYw...",
      auth: "5K0z...",
    },
  };

  await savePushSubscription(testSub);

  const now = Date.now();
  const alerts = [
    {
      id: "alert-1",
      triggerAt: now - 60 * 1000, // Due 1 minute ago
      title: "🔔 Upcoming Class",
      body: "Operating Systems in Room 301. Starts at 10:00 AM.",
      tag: "alert-1",
    },
    {
      id: "alert-2",
      triggerAt: now + 30 * 60 * 1000, // Due in 30 minutes (not due now)
      title: "🔔 Upcoming Class",
      body: "Database Systems in Lab 2. Starts at 11:00 AM.",
      tag: "alert-2",
    },
  ];

  const syncResult = await syncScheduledAlerts(testSub.endpoint, alerts);
  assert.equal(syncResult.synced, 2, "Both safe alerts must be synchronized");

  // Check due alerts
  const due = await getDueAlerts(now);
  assert.equal(due.length, 1, "Only alert-1 should be due right now");
  assert.equal(due[0].alert.id, "alert-1");
  assert.equal(due[0].subscription.endpoint, testSub.endpoint);

  // Mark delivered
  await markAlertsDelivered(["alert-1"]);

  // Due alerts after delivery should now be empty
  const dueAfter = await getDueAlerts(now);
  assert.equal(dueAfter.length, 0, "Delivered alert must no longer be returned as due");
});

test("Push Test 4 — Unsubscribe removes subscription and associated alerts", async () => {
  const testSub = {
    endpoint: "https://fcm.googleapis.com/fcm/send/test-device-2",
    keys: {
      p256dh: "BMh3gYw...",
      auth: "5K0z...",
    },
  };

  await savePushSubscription(testSub);
  await syncScheduledAlerts(testSub.endpoint, [
    {
      id: "alert-future",
      triggerAt: Date.now() + 10000,
      title: "Class",
      body: "Test",
      tag: "alert-future",
    },
  ]);

  await removePushSubscription(testSub.endpoint);

  const due = await getDueAlerts(Date.now() + 20000);
  assert.equal(due.length, 0, "No alerts should exist after unsubscription");
});

test("Push Test 5 — Cleanup prunes delivered alerts older than cutoff", async () => {
  const testSub = {
    endpoint: "https://fcm.googleapis.com/fcm/send/test-device-3",
    keys: {
      p256dh: "BMh3gYw...",
      auth: "5K0z...",
    },
  };

  await savePushSubscription(testSub);

  const now = Date.now();
  const oldTime = now - 48 * 60 * 60 * 1000; // 48 hours ago
  await syncScheduledAlerts(testSub.endpoint, [
    {
      id: "old-alert",
      triggerAt: oldTime,
      title: "Past Class",
      body: "Old notification",
      tag: "old-alert",
    },
  ]);

  await markAlertsDelivered(["old-alert"]);

  const cleaned = await cleanupDeliveredAlerts(24 * 60 * 60 * 1000);
  assert.equal(cleaned, 1, "Old delivered alert should be pruned");
});
