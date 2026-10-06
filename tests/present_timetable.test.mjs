/**
 * Verification test for Present Day Timetable & Notifications.
 * Validates that today's classes match the student's real timetable
 * (Leadership and Management Skills in LT 213 at 11:00 AM, Java Programming at 12:00 PM)
 * and that the demo mock 'Operating Systems' class is no longer delivered.
 * Run with: node --test tests/present_timetable.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  getPresentDayTimetable,
  getTodayRealClasses,
  REAL_SUBJECTS,
  REAL_SESSIONS,
} from "../lib/portal/realTimetable.ts";

test("Present Day Timetable — Tuesday 2026-10-06 classes match student curriculum", () => {
  const timetable = getPresentDayTimetable("2026-10-06");
  assert.equal(timetable.date, "2026-10-06");
  assert.equal(timetable.day, "Tuesday");
  assert.equal(timetable.classes.length, 4);

  // Slot 2: Ethical Hacking
  assert.equal(timetable.classes[0].slot, 2);
  assert.equal(timetable.classes[0].name, "Ethical Hacking");
  assert.equal(timetable.classes[0].room, "LT 407");
  assert.equal(timetable.classes[0].startTime, "09:00");

  // Slot 3: Leadership and Management Skills
  assert.equal(timetable.classes[1].slot, 3);
  assert.equal(timetable.classes[1].name, "Leadership and Management Skills");
  assert.equal(timetable.classes[1].room, "LT 304");
  assert.equal(timetable.classes[1].startTime, "10:00");

  // Slot 4: 11:00 AM — Critical fix! MUST be Leadership and Management Skills, NOT Operating Systems
  assert.equal(timetable.classes[2].slot, 4);
  assert.equal(timetable.classes[2].name, "Leadership and Management Skills");
  assert.equal(timetable.classes[2].room, "LT 213");
  assert.equal(timetable.classes[2].startTime, "11:00");
  assert.notEqual(timetable.classes[2].name, "Operating Systems");

  // Slot 5: 12:00 PM — Java Programming in LT 213
  assert.equal(timetable.classes[3].slot, 5);
  assert.equal(timetable.classes[3].name, "Java Programming");
  assert.equal(timetable.classes[3].room, "LT 213");
  assert.equal(timetable.classes[3].startTime, "12:00");
});

test("Real Subjects — contains student's 8 registered courses", () => {
  const codes = REAL_SUBJECTS.map((s) => s.code);
  assert.ok(codes.includes("E1CSA353"), "Includes Ethical Hacking");
  assert.ok(codes.includes("E1CSA317"), "Includes Leadership and Management Skills");
  assert.ok(codes.includes("E1CSA396"), "Includes Java Programming");
  assert.ok(codes.includes("E1CSA108"), "Includes Soft Skills - II");
  assert.ok(codes.includes("E1CSA400"), "Includes Theory of Computation");
  assert.ok(codes.includes("E1CSA311"), "Includes Cryptography and Network Security");
  assert.ok(codes.includes("E1CSA316"), "Includes Discrete Mathematics");
  assert.ok(codes.includes("E1CSA313"), "Includes Design Project-I");
  assert.ok(!codes.includes("E1CSA318"), "Does not include mock Operating Systems");
});

test("Real Sessions — semester coverage spans multiple weeks", () => {
  assert.ok(REAL_SESSIONS.length > 50, "Full semester sessions are generated");
  const dates = new Set(REAL_SESSIONS.map((s) => s.date));
  assert.ok(dates.size > 10, "Spans multiple unique semester dates");
});
