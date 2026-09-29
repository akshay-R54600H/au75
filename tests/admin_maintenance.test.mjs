import test from "node:test";
import assert from "node:assert/strict";
import {
  verifyAdminCredentials,
  sealAdminSession,
  openAdminSession,
  checkLoginRateLimit,
  recordFailedLogin,
  resetFailedLogin,
} from "../lib/server/adminAuth.ts";
import {
  getMaintenanceConfig,
  updateMaintenanceConfig,
} from "../lib/server/maintenanceDb.ts";

test("admin authentication: verifyAdminCredentials", () => {
  // Test correct credentials matching initial values
  assert.equal(
    verifyAdminCredentials("admin@au75.vercel.app", "Harsha@2009"),
    true,
    "Valid credentials should be accepted"
  );

  // Case insensitive email
  assert.equal(
    verifyAdminCredentials("ADMIN@AU75.VERCEL.APP", "Harsha@2009"),
    true,
    "Email check should be case insensitive"
  );

  // Incorrect password
  assert.equal(
    verifyAdminCredentials("admin@au75.vercel.app", "WrongPassword123!"),
    false,
    "Incorrect password must be rejected"
  );

  // Incorrect email
  assert.equal(
    verifyAdminCredentials("student@au75.vercel.app", "Harsha@2009"),
    false,
    "Incorrect email must be rejected"
  );

  // Empty values
  assert.equal(verifyAdminCredentials("", ""), false);
});

test("admin session token: AES-256-GCM encryption & verification", () => {
  const email = "admin@au75.vercel.app";
  const token = sealAdminSession(email);

  assert.ok(typeof token === "string" && token.length > 30, "Token should be opaque ciphertext");

  const opened = openAdminSession(token);
  assert.ok(opened, "Valid token should be unsealed");
  assert.equal(opened.email, email);
  assert.equal(opened.role, "admin");
  assert.ok(opened.exp > Date.now(), "Token should have future expiry");

  // Tampered token
  const tampered = token.slice(0, -4) + "AAAA";
  assert.equal(openAdminSession(tampered), null, "Tampered token must fail decipherment");

  // Completely invalid token
  assert.equal(openAdminSession("invalid-token-string"), null);
});

test("admin rate limiting: brute-force protection", () => {
  const testIp = "192.168.1.100";
  resetFailedLogin(testIp);

  // Initial check: allowed
  assert.equal(checkLoginRateLimit(testIp).allowed, true);

  // Record 5 failed attempts
  for (let i = 0; i < 5; i++) {
    recordFailedLogin(testIp);
  }

  // 6th check: should be blocked
  const check = checkLoginRateLimit(testIp);
  assert.equal(check.allowed, false, "IP should be blocked after 5 failed attempts");
  assert.ok(check.retryAfterSeconds && check.retryAfterSeconds > 0);

  // Reset clears block
  resetFailedLogin(testIp);
  assert.equal(checkLoginRateLimit(testIp).allowed, true);
});

test("global maintenance: in-memory fallback operations", async () => {
  const initial = await getMaintenanceConfig(true);
  assert.ok(typeof initial.maintenanceMode === "boolean");
  assert.ok(initial.title.length > 0);
  assert.ok(initial.message.length > 0);

  // Put into maintenance
  const updatedOn = await updateMaintenanceConfig({
    maintenanceMode: true,
    title: "Scheduled Maintenance Test",
    message: "Upgrades in progress.",
    updatedBy: "admin@au75.vercel.app",
  });

  assert.equal(updatedOn.maintenanceMode, true);
  assert.equal(updatedOn.title, "Scheduled Maintenance Test");
  assert.equal(updatedOn.message, "Upgrades in progress.");

  // Verify fetch returns updated state
  const fetched = await getMaintenanceConfig(true);
  assert.equal(fetched.maintenanceMode, true);
  assert.equal(fetched.title, "Scheduled Maintenance Test");

  // Restore live
  const restored = await updateMaintenanceConfig({
    maintenanceMode: false,
    updatedBy: "admin@au75.vercel.app",
  });
  assert.equal(restored.maintenanceMode, false);
});
