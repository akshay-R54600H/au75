import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NOTIFICATION_OFFSET_MINUTES,
  NOTIFICATION_OFFSET_OPTIONS,
} from "../lib/notifications/types.ts";
import {
  formatNotificationTime,
  generateNotificationId,
  calculateNotificationTime,
  buildClassNotification,
  generateSchedule,
} from "../lib/notifications/scheduler.ts";
import { DEFAULT_SETTINGS } from "../lib/mock/data.ts";
import { NAV_LINKS } from "../components/layout/nav.ts";

test("Test 1 — Default timing: default offset is 5 minutes", () => {
  // Constant verification
  assert.equal(DEFAULT_NOTIFICATION_OFFSET_MINUTES, 5, "Default offset constant must be 5 minutes");

  // Default app settings verification
  assert.equal(
    DEFAULT_SETTINGS.notifications?.offsetMinutes,
    5,
    "DEFAULT_SETTINGS notification offset must be 5 minutes (not 10)"
  );
  assert.equal(
    DEFAULT_SETTINGS.notifications?.enabled,
    true,
    "Notifications must be ON by default for every device"
  );

  // Offset options verification
  const values = NOTIFICATION_OFFSET_OPTIONS.map((o) => o.value);
  assert.deepEqual(values, [5, 10, 15, 30], "Must support 5, 10, 15, and 30 minute options");
});

test("Test 2 — Class notification: formatting and 5-minute offset trigger", () => {
  const session = {
    id: "sess-1",
    date: "2026-10-15",
    day: "Thursday",
    subjectId: "portal-py",
    subjectCode: "CS201",
    subjectName: "Python Programming",
    room: "Block A 204",
    session: 3,
    startTime: "10:00",
    endTime: "10:55",
    isFuture: true,
  };

  // Notification time calculation
  const notifTime = calculateNotificationTime(session.date, session.startTime, 5);
  assert.ok(notifTime !== null);

  const [y, m, d] = session.date.split("-").map(Number);
  const expectedClassTime = new Date(y, m - 1, d, 10, 0, 0, 0).getTime();
  const expectedNotifTime = expectedClassTime - 5 * 60 * 1000; // 9:55 AM
  assert.equal(notifTime, expectedNotifTime, "Notification must be calculated for 9:55 AM");

  // Notification content
  const notif = buildClassNotification(session, 5);
  assert.ok(notif);
  assert.equal(notif.title, "🔔 Upcoming Class");
  assert.equal(
    notif.body,
    "Python Programming is in Block A 204.\n\nStarts at 10:00 AM."
  );
  assert.equal(notif.venue, "Block A 204");
  assert.equal(notif.formattedTime, "10:00 AM");
});

test("Test 3 — Change timing: 5 -> 15 minutes offset", () => {
  const session = {
    id: "sess-1",
    date: "2026-10-15",
    day: "Thursday",
    subjectId: "portal-py",
    subjectCode: "CS201",
    subjectName: "Python Programming",
    room: "Block A 204",
    session: 3,
    startTime: "10:00",
    isFuture: true,
  };

  const notifTime15 = calculateNotificationTime(session.date, session.startTime, 15);
  assert.ok(notifTime15 !== null);

  const [y, m, d] = session.date.split("-").map(Number);
  const expectedClassTime = new Date(y, m - 1, d, 10, 0, 0, 0).getTime();
  const expectedNotifTime15 = expectedClassTime - 15 * 60 * 1000; // 9:45 AM
  assert.equal(notifTime15, expectedNotifTime15, "Notification must be calculated for 9:45 AM");
});

test("Test 4 — Multiple classes: back-to-back sessions each receive one notification", () => {
  const sessions = [
    {
      id: "s1",
      date: "2026-10-20",
      day: "Tuesday",
      subjectId: "py",
      subjectCode: "CS101",
      subjectName: "Python Programming",
      room: "Block A 201",
      session: 2,
      startTime: "09:00",
      isFuture: true,
    },
    {
      id: "s2",
      date: "2026-10-20",
      day: "Tuesday",
      subjectId: "os",
      subjectCode: "CS102",
      subjectName: "Operating System",
      room: "Block B 301",
      session: 3,
      startTime: "10:00",
      isFuture: true,
    },
    {
      id: "s3",
      date: "2026-10-20",
      day: "Tuesday",
      subjectId: "db",
      subjectCode: "CS103",
      subjectName: "Database Systems",
      room: "Lab 2",
      session: 4,
      startTime: "11:00",
      isFuture: true,
    },
  ];

  // Base timestamp before 9:00 AM on 2026-10-20
  const [y, m, d] = [2026, 10, 20];
  const testNow = new Date(y, m - 1, d, 8, 0, 0, 0).getTime();

  const schedule = generateSchedule({
    sessions,
    offsetMinutes: 5,
    nowMs: testNow,
  });

  assert.equal(schedule.length, 3, "All 3 classes must have a scheduled notification");

  // Check times: 8:55 AM, 9:55 AM, 10:55 AM
  const expectedTimes = [
    new Date(y, m - 1, d, 8, 55, 0, 0).getTime(),
    new Date(y, m - 1, d, 9, 55, 0, 0).getTime(),
    new Date(y, m - 1, d, 10, 55, 0, 0).getTime(),
  ];

  assert.equal(schedule[0].notificationTime, expectedTimes[0]);
  assert.equal(schedule[1].notificationTime, expectedTimes[1]);
  assert.equal(schedule[2].notificationTime, expectedTimes[2]);

  assert.equal(schedule[0].body, "Python Programming is in Block A 201.\n\nStarts at 9:00 AM.");
  assert.equal(schedule[1].body, "Operating System is in Block B 301.\n\nStarts at 10:00 AM.");
  assert.equal(schedule[2].body, "Database Systems is in Lab 2.\n\nStarts at 11:00 AM.");
});

test("Test 5 — Resync: changed venue replaces schedule and avoids duplicate entries", () => {
  const beforeSync = [
    {
      id: "s1",
      date: "2026-10-20",
      day: "Tuesday",
      subjectId: "os",
      subjectCode: "CS102",
      subjectName: "Operating System",
      room: "Room 301",
      session: 3,
      startTime: "10:00",
      isFuture: true,
    },
  ];

  const afterSync = [
    {
      id: "s1",
      date: "2026-10-20",
      day: "Tuesday",
      subjectId: "os",
      subjectCode: "CS102",
      subjectName: "Operating System",
      room: "Room 405", // Venue updated on portal
      session: 3,
      startTime: "10:00",
      isFuture: true,
    },
  ];

  const testNow = new Date(2026, 9, 20, 8, 0, 0, 0).getTime();
  const scheduleAfter = generateSchedule({
    sessions: afterSync,
    offsetMinutes: 5,
    nowMs: testNow,
  });

  assert.equal(scheduleAfter.length, 1);
  assert.equal(scheduleAfter[0].venue, "Room 405");
  assert.equal(scheduleAfter[0].body, "Operating System is in Room 405.\n\nStarts at 10:00 AM.");
});

test("Test 6 — Graceful handling of missing venue (fallback to Venue unavailable)", () => {
  const sessionNoVenue = {
    id: "s-novenue",
    date: "2026-10-20",
    day: "Tuesday",
    subjectId: "os",
    subjectCode: "CS102",
    subjectName: "Operating System",
    room: "", // Missing / empty venue
    session: 3,
    startTime: "10:00",
    isFuture: true,
  };

  const notif = buildClassNotification(sessionNoVenue, 5);
  assert.ok(notif);
  assert.equal(notif.venue, "Venue unavailable");
  assert.equal(notif.body, "Operating System is in Venue unavailable.\n\nStarts at 10:00 AM.");
});

test("Test 7 — Duplicate timetable entries: de-duplicated by unique ID", () => {
  const duplicateSessions = [
    {
      id: "dup1",
      date: "2026-10-20",
      day: "Tuesday",
      subjectId: "os",
      subjectCode: "CS102",
      subjectName: "Operating System",
      room: "Room 301",
      session: 3,
      startTime: "10:00",
      isFuture: true,
    },
    {
      id: "dup2",
      date: "2026-10-20",
      day: "Tuesday",
      subjectId: "os",
      subjectCode: "CS102",
      subjectName: "Operating System",
      room: "Room 301",
      session: 3,
      startTime: "10:00",
      isFuture: true,
    },
  ];

  const testNow = new Date(2026, 9, 20, 8, 0, 0, 0).getTime();
  const schedule = generateSchedule({
    sessions: duplicateSessions,
    offsetMinutes: 5,
    nowMs: testNow,
  });

  assert.equal(schedule.length, 1, "Duplicate timetable entries must yield exactly 1 notification");
});

test("Test 8 — Holiday: classes on holiday dates are omitted", () => {
  const sessions = [
    {
      id: "class-on-holiday",
      date: "2026-10-25",
      day: "Sunday",
      subjectId: "os",
      subjectCode: "CS102",
      subjectName: "Operating System",
      room: "Room 301",
      session: 3,
      startTime: "10:00",
      isFuture: true,
    },
    {
      id: "class-on-working-day",
      date: "2026-10-26",
      day: "Monday",
      subjectId: "os",
      subjectCode: "CS102",
      subjectName: "Operating System",
      room: "Room 301",
      session: 3,
      startTime: "10:00",
      isFuture: true,
    },
  ];

  const academicDays = [
    { date: "2026-10-25", type: "holiday", description: "Diwali" },
    { date: "2026-10-26", type: "working" },
  ];

  const testNow = new Date(2026, 9, 24, 8, 0, 0, 0).getTime();
  const schedule = generateSchedule({
    sessions,
    academicDays,
    offsetMinutes: 5,
    nowMs: testNow,
  });

  assert.equal(schedule.length, 1, "Holiday classes must not be scheduled");
  assert.equal(schedule[0].classDate, "2026-10-26");
});

test("Test 9 — Privacy: no student credentials, USN, OTP, or attendance in notification", () => {
  const session = {
    id: "s1",
    date: "2026-10-20",
    day: "Tuesday",
    subjectId: "os",
    subjectCode: "CS102",
    subjectName: "Operating System",
    room: "Room 301",
    session: 3,
    startTime: "10:00",
    isFuture: true,
  };

  const notif = buildClassNotification(session, 5);
  assert.ok(notif);

  const serialized = JSON.stringify(notif).toLowerCase();

  // Must NOT contain personal/student identifiers
  assert.equal(serialized.includes("password"), false);
  assert.equal(serialized.includes("studentid"), false);
  assert.equal(serialized.includes("usn"), false);
  assert.equal(serialized.includes("otp"), false);
  assert.equal(serialized.includes("captcha"), false);
  assert.equal(serialized.includes("attendance"), false);
});

test("Test 10 — Navigation: main navbar contains NO Notifications item", () => {
  const labels = NAV_LINKS.map((link) => link.label);
  const hrefs = NAV_LINKS.map((link) => link.href);

  assert.equal(labels.includes("Notifications"), false, "Navbar must NOT have Notifications item");
  assert.equal(hrefs.includes("/notifications"), false, "Navbar must NOT have /notifications href");

  // Navbar order must remain strictly Home, Calendar, Skips, Settings
  assert.deepEqual(labels, ["Home", "Calendar", "Skips", "Settings"]);
});
