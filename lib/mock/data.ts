// ============================================================
// Demo data — shown until the first portal sync.
// Generated relative to today so the demo always has upcoming classes.
// ============================================================

import type { Subject, ClassSession, AcademicDay, AppSettings } from "@/lib/models/types";

export const DEFAULT_SETTINGS: AppSettings = {
  attendanceTarget: 75,
  requirement: "atLeast",
  theme: "system",
  showDecimals: false,
  milestones: [],
};

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Portal session slots (08:00 start, 55-minute periods).
const SLOT: Record<number, [string, string]> = {
  1: ["08:00", "08:55"],
  2: ["09:00", "09:55"],
  3: ["10:00", "10:55"],
  4: ["11:00", "11:55"],
  5: ["12:00", "12:55"],
  6: ["14:00", "14:55"],
  7: ["15:00", "15:55"],
};

interface DemoSubject extends Subject {
  /** [weekday (1=Mon), slot] pairs */
  schedule: [number, number][];
}

const DEMO: DemoSubject[] = [
  { id: "portal-e1csa316", code: "E1CSA316", name: "Discrete Mathematics", faculty: "Nupur Nandi", credits: 4, room: "LT 407", attended: 21, total: 24, schedule: [[1, 1], [3, 1], [5, 2]] },
  { id: "portal-e1csa312", code: "E1CSA312", name: "Data Structures & Algorithms", faculty: "Ravi Shankar", credits: 4, room: "LT 402", attended: 18, total: 24, schedule: [[1, 3], [2, 2], [4, 3]] },
  { id: "portal-e1csa318", code: "E1CSA318", name: "Operating Systems", faculty: "Meera Iyer", credits: 3, room: "LT 305", attended: 14, total: 20, schedule: [[2, 4], [4, 1]] },
  { id: "portal-e1csa320", code: "E1CSA320", name: "Database Management Systems", faculty: "Arjun Rao", credits: 4, room: "Lab 2", attended: 22, total: 26, schedule: [[1, 6], [3, 6], [5, 4]] },
  { id: "portal-e1hsa201", code: "E1HSA201", name: "Professional Communication", faculty: "Sarah Thomas", credits: 2, room: "LT 210", attended: 9, total: 14, schedule: [[2, 6], [5, 1]] },
];

export const MOCK_SUBJECTS: Subject[] = DEMO.map(({ schedule: _s, ...s }) => s);

function build(): ClassSession[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = iso(today);
  const out: ClassSession[] = [];
  // 6 weeks back, 10 weeks ahead
  for (let offset = -42; offset <= 70; offset++) {
    const d = addDays(today, offset);
    const wd = d.getDay();
    const date = iso(d);
    for (const s of DEMO) {
      for (const [day, slot] of s.schedule) {
        if (day !== wd) continue;
        const [startTime, endTime] = SLOT[slot];
        out.push({
          id: `${date}-${s.code.toLowerCase()}-${slot}`,
          date,
          day: DAY_NAMES[wd],
          subjectId: s.id,
          subjectCode: s.code,
          subjectName: s.name,
          faculty: s.faculty,
          session: slot,
          startTime,
          endTime,
          room: s.room,
          isFuture: date >= todayIso,
        });
      }
    }
  }
  return out;
}

export const MOCK_SESSIONS: ClassSession[] = build();

export const MOCK_ACADEMIC_DAYS: AcademicDay[] = [];
