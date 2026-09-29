import assert from "node:assert/strict";

const BASE = "http://localhost:3000";

async function runTests() {
  console.log("=== Starting End-to-End Server API & Route Verification ===");

  // 1. Initial maintenance state
  console.log("\n[Test 1] Checking GET /api/maintenance (initial state)...");
  const resMaint = await fetch(`${BASE}/api/maintenance`);
  assert.equal(resMaint.status, 200);
  const dataMaint = await resMaint.json();
  console.log("Response:", dataMaint);
  assert.equal(dataMaint.maintenanceMode, false, "Initial maintenance mode should be false");
  console.log("✓ Initial maintenance mode is false");

  // 2. Public pages accessible
  console.log("\n[Test 2] Checking public pages (/ and /dashboard)...");
  const resHome = await fetch(`${BASE}/`);
  assert.equal(resHome.status, 200);
  const resDash = await fetch(`${BASE}/dashboard`);
  assert.equal(resDash.status, 200);
  console.log("✓ Public pages return HTTP 200 OK");

  // 3. /admin route accessible without redirect loop
  console.log("\n[Test 3] Checking /admin route accessibility...");
  const resAdminPage = await fetch(`${BASE}/admin`);
  assert.equal(resAdminPage.status, 200);
  console.log("✓ /admin page renders with HTTP 200 OK");

  // 4. Failed login with incorrect credentials
  console.log("\n[Test 4] Testing login with wrong credentials...");
  const resWrongLogin = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@au75.vercel.app", password: "WrongPassword" }),
  });
  assert.equal(resWrongLogin.status, 401);
  const wrongData = await resWrongLogin.json();
  console.log("Wrong login response:", wrongData);
  assert.ok(wrongData.error);
  console.log("✓ Rejected incorrect login with 401");

  // 5. Successful login with correct credentials
  console.log("\n[Test 5] Testing login with correct credentials...");
  const resLogin = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@au75.vercel.app", password: "Harsha@2009" }),
  });
  assert.equal(resLogin.status, 200);
  const loginData = await resLogin.json();
  console.log("Login success response:", loginData);
  assert.equal(loginData.ok, true);

  const setCookieHeader = resLogin.headers.get("set-cookie");
  assert.ok(setCookieHeader, "set-cookie header must be present");
  assert.ok(setCookieHeader.includes("au75_admin_session"), "Cookie name must be au75_admin_session");
  assert.ok(setCookieHeader.toLowerCase().includes("httponly"), "Cookie must have HttpOnly flag");
  console.log("Set-Cookie header:", setCookieHeader);
  console.log("✓ Correct login returns 200 and sets secure HttpOnly session cookie");

  // Extract cookie value for subsequent requests
  const cookieValue = setCookieHeader.split(";")[0];

  // 6. Check session endpoint
  console.log("\n[Test 6] Checking GET /api/admin/session with cookie...");
  const resSession = await fetch(`${BASE}/api/admin/session`, {
    headers: { Cookie: cookieValue },
  });
  assert.equal(resSession.status, 200);
  const sessionData = await resSession.json();
  console.log("Session data:", sessionData);
  assert.equal(sessionData.authenticated, true);
  assert.equal(sessionData.email, "admin@au75.vercel.app");
  console.log("✓ Admin session verified");

  // 7. Protected admin mutation rejected without cookie
  console.log("\n[Test 7] Testing POST /api/admin/maintenance without session cookie...");
  const resUnauth = await fetch(`${BASE}/api/admin/maintenance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ maintenanceMode: true }),
  });
  assert.equal(resUnauth.status, 401);
  console.log("✓ Unauthorized maintenance change rejected with 401");

  // 8. Admin enables maintenance mode
  console.log("\n[Test 8] Enabling maintenance mode via POST /api/admin/maintenance...");
  const resEnable = await fetch(`${BASE}/api/admin/maintenance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieValue,
    },
    body: JSON.stringify({
      maintenanceMode: true,
      title: "AU75 System Maintenance",
      message: "Upgrades are actively taking place. Please check back in a few minutes.",
    }),
  });
  assert.equal(resEnable.status, 200);
  const enableData = await resEnable.json();
  console.log("Enable maintenance response:", enableData);
  assert.equal(enableData.ok, true);
  assert.equal(enableData.data.maintenanceMode, true);
  console.log("✓ Maintenance mode enabled by admin");

  // 9. Verify public /api/maintenance reflects enabled maintenance
  console.log("\n[Test 9] Polling GET /api/maintenance after enabling...");
  const resMaintAfter = await fetch(`${BASE}/api/maintenance`);
  const dataMaintAfter = await resMaintAfter.json();
  console.log("Public maintenance endpoint response:", dataMaintAfter);
  assert.equal(dataMaintAfter.maintenanceMode, true);
  assert.equal(dataMaintAfter.title, "AU75 System Maintenance");
  assert.equal(dataMaintAfter.message, "Upgrades are actively taking place. Please check back in a few minutes.");
  console.log("✓ Public maintenance reflects new title, message, and maintenanceMode = true");

  // 10. Admin disables maintenance mode (Take Live)
  console.log("\n[Test 10] Disabling maintenance mode (Take Live)...");
  const resDisable = await fetch(`${BASE}/api/admin/maintenance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieValue,
    },
    body: JSON.stringify({
      maintenanceMode: false,
    }),
  });
  assert.equal(resDisable.status, 200);
  const disableData = await resDisable.json();
  console.log("Disable maintenance response:", disableData);
  assert.equal(disableData.ok, true);
  assert.equal(disableData.data.maintenanceMode, false);
  console.log("✓ Maintenance mode disabled by admin");

  // 11. Verify public /api/maintenance reflects live state
  console.log("\n[Test 11] Polling GET /api/maintenance after taking live...");
  const resLiveCheck = await fetch(`${BASE}/api/maintenance`);
  const dataLiveCheck = await resLiveCheck.json();
  console.log("Public maintenance response:", dataLiveCheck);
  assert.equal(dataLiveCheck.maintenanceMode, false);
  console.log("✓ Application is back LIVE");

  // 12. Admin logout
  console.log("\n[Test 12] Testing POST /api/admin/logout...");
  const resLogout = await fetch(`${BASE}/api/admin/logout`, {
    method: "POST",
    headers: { Cookie: cookieValue },
  });
  assert.equal(resLogout.status, 200);
  const logoutCookieHeader = resLogout.headers.get("set-cookie");
  console.log("Logout set-cookie:", logoutCookieHeader);
  assert.ok(logoutCookieHeader.includes("au75_admin_session=;"));
  console.log("✓ Admin cookie cleared");

  console.log("\n=======================================================");
  console.log("🎉 ALL END-TO-END SERVER & ROUTE TESTS PASSED PERFECTLY!");
  console.log("=======================================================");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
