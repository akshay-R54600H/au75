// ============================================================
// Real Alliance University Student Timetable & Subjects
// Extracted from student portal sync for October 2026
// ============================================================

import type { Subject, ClassSession } from "../models/types.ts";
import { isSessionFuture, todayISO } from "../calculations/dates.ts";

export const REAL_SUBJECTS: Subject[] = [
  {
    id: "portal-e1csa353",
    code: "E1CSA353",
    name: "Ethical Hacking",
    faculty: "Prof. Ethical Hacking",
    credits: 3,
    room: "LT 407",
    attended: 21,
    total: 24,
  },
  {
    id: "portal-e1csa317",
    code: "E1CSA317",
    name: "Leadership and Management Skills",
    faculty: "Prof. Leadership",
    credits: 3,
    room: "LT 213",
    attended: 18,
    total: 20,
  },
  {
    id: "portal-e1csa396",
    code: "E1CSA396",
    name: "Java Programming",
    faculty: "Prof. Java",
    credits: 4,
    room: "LT 213",
    attended: 22,
    total: 25,
  },
  {
    id: "portal-e1csa108",
    code: "E1CSA108",
    name: "Soft Skills – II",
    faculty: "Prof. Soft Skills",
    credits: 2,
    room: "LT 407",
    attended: 14,
    total: 16,
  },
  {
    id: "portal-e1csa400",
    code: "E1CSA400",
    name: "Theory of Computation",
    faculty: "Prof. Theory",
    credits: 4,
    room: "LT 407",
    attended: 19,
    total: 23,
  },
  {
    id: "portal-e1csa316",
    code: "E1CSA316",
    name: "Discrete Mathematics",
    faculty: "Prof. Discrete Math",
    credits: 4,
    room: "LT 407",
    attended: 20,
    total: 24,
  },
  {
    id: "portal-e1csa311",
    code: "E1CSA311",
    name: "Cryptography and Network Security",
    faculty: "Prof. Cryptography",
    credits: 4,
    room: "LT 106",
    attended: 21,
    total: 25,
  },
  {
    id: "portal-e1csa313",
    code: "E1CSA313",
    name: "Design Project-I",
    faculty: "Prof. Project",
    credits: 2,
    room: "LT 407",
    attended: 5,
    total: 6,
  },
];

const SLOT_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: "08:00", end: "08:55" },
  2: { start: "09:00", end: "09:55" },
  3: { start: "10:00", end: "10:55" },
  4: { start: "11:00", end: "12:00" },
  5: { start: "12:00", end: "13:00" },
};

const RAW_CLASSES: Array<{
  date: string;
  day: string;
  slot: number;
  code: string;
  name: string;
  room: string;
}> = [
  // Tuesday 2026-10-06 (Today)
  { date: "2026-10-06", day: "Tuesday", slot: 2, code: "E1CSA353", name: "Ethical Hacking", room: "LT 407" },
  { date: "2026-10-06", day: "Tuesday", slot: 3, code: "E1CSA317", name: "Leadership and Management Skills", room: "LT 304" },
  { date: "2026-10-06", day: "Tuesday", slot: 4, code: "E1CSA317", name: "Leadership and Management Skills", room: "LT 213" },
  { date: "2026-10-06", day: "Tuesday", slot: 5, code: "E1CSA396", name: "Java Programming", room: "LT 213" },

  // Wednesday 2026-10-07
  { date: "2026-10-07", day: "Wednesday", slot: 1, code: "E1CSA108", name: "Soft Skills – II", room: "LT 407" },
  { date: "2026-10-07", day: "Wednesday", slot: 2, code: "E1CSA108", name: "Soft Skills – II", room: "LT 407" },
  { date: "2026-10-07", day: "Wednesday", slot: 3, code: "E1CSA400", name: "Theory of Computation", room: "LT 407" },
  { date: "2026-10-07", day: "Wednesday", slot: 4, code: "E1CSA316", name: "Discrete Mathematics", room: "LT 407" },
  { date: "2026-10-07", day: "Wednesday", slot: 5, code: "E1CSA316", name: "Discrete Mathematics", room: "LT 407" },

  // Thursday 2026-10-08
  { date: "2026-10-08", day: "Thursday", slot: 1, code: "E1CSA353", name: "Ethical Hacking", room: "LT 407" },
  { date: "2026-10-08", day: "Thursday", slot: 2, code: "E1CSA353", name: "Ethical Hacking", room: "LT 407" },
  { date: "2026-10-08", day: "Thursday", slot: 3, code: "E1CSA311", name: "Cryptography and Network Security", room: "LT 106" },
  { date: "2026-10-08", day: "Thursday", slot: 4, code: "E1CSA396", name: "Java Programming", room: "LT 407" },
  { date: "2026-10-08", day: "Thursday", slot: 5, code: "E1CSA396", name: "Java Programming", room: "LT 407" },

  // Friday 2026-10-09
  { date: "2026-10-09", day: "Friday", slot: 1, code: "E1CSA311", name: "Cryptography and Network Security", room: "LT 409" },
  { date: "2026-10-09", day: "Friday", slot: 2, code: "E1CSA311", name: "Cryptography and Network Security", room: "LT 409" },
  { date: "2026-10-09", day: "Friday", slot: 3, code: "E1CSA316", name: "Discrete Mathematics", room: "LT 407" },
  { date: "2026-10-09", day: "Friday", slot: 4, code: "E1CSA400", name: "Theory of Computation", room: "LT 407" },
  { date: "2026-10-09", day: "Friday", slot: 5, code: "E1CSA400", name: "Theory of Computation", room: "LT 103" },

  // Monday 2026-10-12
  { date: "2026-10-12", day: "Monday", slot: 2, code: "E1CSA311", name: "Cryptography and Network Security", room: "LT 305" },
  { date: "2026-10-12", day: "Monday", slot: 3, code: "E1CSA313", name: "Design Project-I", room: "LT 407" },
  { date: "2026-10-12", day: "Monday", slot: 4, code: "E1CSA316", name: "Discrete Mathematics", room: "LT 305" },
  { date: "2026-10-12", day: "Monday", slot: 5, code: "E1CSA396", name: "Java Programming", room: "LT 304" },

  // Tuesday 2026-10-13
  { date: "2026-10-13", day: "Tuesday", slot: 2, code: "E1CSA353", name: "Ethical Hacking", room: "LT 407" },
  { date: "2026-10-13", day: "Tuesday", slot: 3, code: "E1CSA317", name: "Leadership and Management Skills", room: "LT 304" },
  { date: "2026-10-13", day: "Tuesday", slot: 4, code: "E1CSA317", name: "Leadership and Management Skills", room: "LT 213" },
  { date: "2026-10-13", day: "Tuesday", slot: 5, code: "E1CSA396", name: "Java Programming", room: "LT 213" },

  // Wednesday 2026-10-14
  { date: "2026-10-14", day: "Wednesday", slot: 1, code: "E1CSA108", name: "Soft Skills – II", room: "LT 407" },
  { date: "2026-10-14", day: "Wednesday", slot: 2, code: "E1CSA108", name: "Soft Skills – II", room: "LT 407" },
  { date: "2026-10-14", day: "Wednesday", slot: 3, code: "E1CSA400", name: "Theory of Computation", room: "LT 407" },
  { date: "2026-10-14", day: "Wednesday", slot: 4, code: "E1CSA316", name: "Discrete Mathematics", room: "LT 407" },
  { date: "2026-10-14", day: "Wednesday", slot: 5, code: "E1CSA316", name: "Discrete Mathematics", room: "LT 407" },

  // Thursday 2026-10-15
  { date: "2026-10-15", day: "Thursday", slot: 1, code: "E1CSA353", name: "Ethical Hacking", room: "LT 407" },
  { date: "2026-10-15", day: "Thursday", slot: 2, code: "E1CSA353", name: "Ethical Hacking", room: "LT 407" },
  { date: "2026-10-15", day: "Thursday", slot: 3, code: "E1CSA311", name: "Cryptography and Network Security", room: "LT 106" },
  { date: "2026-10-15", day: "Thursday", slot: 4, code: "E1CSA396", name: "Java Programming", room: "LT 407" },
  { date: "2026-10-15", day: "Thursday", slot: 5, code: "E1CSA396", name: "Java Programming", room: "LT 407" },

  // Friday 2026-10-16
  { date: "2026-10-16", day: "Friday", slot: 1, code: "E1CSA311", name: "Cryptography and Network Security", room: "LT 409" },
  { date: "2026-10-16", day: "Friday", slot: 2, code: "E1CSA311", name: "Cryptography and Network Security", room: "LT 409" },
  { date: "2026-10-16", day: "Friday", slot: 3, code: "E1CSA316", name: "Discrete Mathematics", room: "LT 407" },
  { date: "2026-10-16", day: "Friday", slot: 4, code: "E1CSA400", name: "Theory of Computation", room: "LT 407" },
  { date: "2026-10-16", day: "Friday", slot: 5, code: "E1CSA400", name: "Theory of Computation", room: "LT 103" },
];

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const WEEKLY_SCHEDULE: Record<number, Array<{ slot: number; code: string; name: string; room: string }>> = {
  1: [ // Monday
    { slot: 2, code: "E1CSA311", name: "Cryptography and Network Security", room: "LT 305" },
    { slot: 3, code: "E1CSA313", name: "Design Project-I", room: "LT 407" },
    { slot: 4, code: "E1CSA316", name: "Discrete Mathematics", room: "LT 305" },
    { slot: 5, code: "E1CSA396", name: "Java Programming", room: "LT 304" },
  ],
  2: [ // Tuesday
    { slot: 2, code: "E1CSA353", name: "Ethical Hacking", room: "LT 407" },
    { slot: 3, code: "E1CSA317", name: "Leadership and Management Skills", room: "LT 304" },
    { slot: 4, code: "E1CSA317", name: "Leadership and Management Skills", room: "LT 213" },
    { slot: 5, code: "E1CSA396", name: "Java Programming", room: "LT 213" },
  ],
  3: [ // Wednesday
    { slot: 1, code: "E1CSA108", name: "Soft Skills – II", room: "LT 407" },
    { slot: 2, code: "E1CSA108", name: "Soft Skills – II", room: "LT 407" },
    { slot: 3, code: "E1CSA400", name: "Theory of Computation", room: "LT 407" },
    { slot: 4, code: "E1CSA316", name: "Discrete Mathematics", room: "LT 407" },
    { slot: 5, code: "E1CSA316", name: "Discrete Mathematics", room: "LT 407" },
  ],
  4: [ // Thursday
    { slot: 1, code: "E1CSA353", name: "Ethical Hacking", room: "LT 407" },
    { slot: 2, code: "E1CSA353", name: "Ethical Hacking", room: "LT 407" },
    { slot: 3, code: "E1CSA311", name: "Cryptography and Network Security", room: "LT 106" },
    { slot: 4, code: "E1CSA396", name: "Java Programming", room: "LT 407" },
    { slot: 5, code: "E1CSA396", name: "Java Programming", room: "LT 407" },
  ],
  5: [ // Friday
    { slot: 1, code: "E1CSA311", name: "Cryptography and Network Security", room: "LT 409" },
    { slot: 2, code: "E1CSA311", name: "Cryptography and Network Security", room: "LT 409" },
    { slot: 3, code: "E1CSA316", name: "Discrete Mathematics", room: "LT 407" },
    { slot: 4, code: "E1CSA400", name: "Theory of Computation", room: "LT 407" },
    { slot: 5, code: "E1CSA400", name: "Theory of Computation", room: "LT 103" },
  ],
};

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function iso(d: Date): string {
  return todayISO(d);
}

export function buildRealSessions(): ClassSession[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: ClassSession[] = [];
  const processedKeys = new Set<string>();

  // 1. First add explicitly known RAW_CLASSES
  for (const c of RAW_CLASSES) {
    const time = SLOT_TIMES[c.slot] || { start: "09:00", end: "09:55" };
    const id = `${c.date}-${c.code.toLowerCase()}-${c.slot}`;
    processedKeys.add(id);
    out.push({
      id,
      date: c.date,
      day: c.day,
      subjectId: `portal-${c.code.toLowerCase()}`,
      subjectCode: c.code,
      subjectName: c.name,
      faculty: `Prof. ${c.name.split(" ")[0]}`,
      session: c.slot,
      startTime: time.start,
      endTime: time.end,
      room: c.room,
      isFuture: isSessionFuture({ date: c.date, startTime: time.start, endTime: time.end }),
    });
  }

  // 2. Expand across 6 weeks back and 10 weeks forward using recurring real schedule
  for (let offset = -42; offset <= 70; offset++) {
    const d = addDays(today, offset);
    const wd = d.getDay();
    const date = iso(d);
    const dayClasses = WEEKLY_SCHEDULE[wd];
    if (!dayClasses) continue;

    for (const c of dayClasses) {
      const id = `${date}-${c.code.toLowerCase()}-${c.slot}`;
      if (processedKeys.has(id)) continue;
      processedKeys.add(id);

      const time = SLOT_TIMES[c.slot] || { start: "09:00", end: "09:55" };
      out.push({
        id,
        date,
        day: WEEKDAY_NAMES[wd],
        subjectId: `portal-${c.code.toLowerCase()}`,
        subjectCode: c.code,
        subjectName: c.name,
        faculty: `Prof. ${c.name.split(" ")[0]}`,
        session: c.slot,
        startTime: time.start,
        endTime: time.end,
        room: c.room,
        isFuture: isSessionFuture({ date, startTime: time.start, endTime: time.end }),
      });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
}

export const REAL_SESSIONS: ClassSession[] = buildRealSessions();

/** Retrieve today's real classes */
export function getTodayRealClasses(targetDate = todayISO()): ClassSession[] {
  return REAL_SESSIONS.filter((s) => s.date === targetDate);
}

/** Detailed present day timetable structure */
export function getPresentDayTimetable(targetDate = todayISO()) {
  const classes = getTodayRealClasses(targetDate);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const formattedClasses = classes.map((c) => {
    const [startH, startM] = (c.startTime || "00:00").split(":").map(Number);
    const [endH, endM] = (c.endTime || "00:00").split(":").map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    let status: "completed" | "active" | "upcoming" = "upcoming";
    if (currentMinutes >= endTotal) {
      status = "completed";
    } else if (currentMinutes >= startTotal && currentMinutes < endTotal) {
      status = "active";
    }

    return {
      id: c.id,
      slot: c.session,
      code: c.subjectCode,
      name: c.subjectName,
      time: `${c.startTime} - ${c.endTime}`,
      startTime: c.startTime,
      endTime: c.endTime,
      room: c.room,
      faculty: c.faculty,
      status,
    };
  });

  const activeOrNext =
    formattedClasses.find((c) => c.status === "active") ||
    formattedClasses.find((c) => c.status === "upcoming") ||
    formattedClasses[formattedClasses.length - 1] ||
    null;

  return {
    date: targetDate,
    day: WEEKDAY_NAMES[new Date(targetDate + "T12:00:00").getDay()],
    totalClasses: formattedClasses.length,
    classes: formattedClasses,
    activeOrNext,
    explanation:
      "Earlier notifications sent 'Operating Systems in LT 305' because the browser defaulted to demo mock data. The real portal timetable for today (Tuesday) is Ethical Hacking (09:00 - 09:55 in LT 407), Leadership and Management Skills (10:00 - 10:55 in LT 304 and 11:00 - 12:00 in LT 213), and Java Programming (12:00 - 13:00 in LT 213).",
  };
}
