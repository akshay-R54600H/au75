// ============================================================
// Core data models for AU75
// ============================================================

export type PredictionState = "present" | "absent" | "ignore";

export type AttendanceRequirement = "atLeast" | "strictlyAbove";

export type SubjectStatus = "safe" | "warning" | "danger";

export type AcademicDayType = "working" | "holiday" | "exam" | "break" | "unknown";

export type ThemeId = "system" | "light" | "dark";

export interface Subject {
  id: string;
  code: string;
  name: string;
  faculty?: string;
  credits?: number;
  section?: string;
  room?: string;
  startTime?: string;
  endTime?: string;
  attended: number;
  total: number;
}

export interface ExamMilestone {
  id: string;
  label: string;
  date: string; // ISO date — classes before this date count toward milestone
}

export interface ClassSession {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  day: string; // e.g. "Monday"
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  faculty?: string;
  session: number;
  startTime?: string; // "HH:MM"
  endTime?: string; // "HH:MM"
  room?: string;
  isFuture: boolean;
}

export interface AcademicDay {
  date: string;
  type: AcademicDayType;
  description?: string;
}

export interface AppSettings {
  attendanceTarget: number; // e.g. 75
  requirement: AttendanceRequirement;
  theme: ThemeId;
  showDecimals: boolean;
  milestones: ExamMilestone[];
  lastSyncedAt?: string; // ISO datetime — undefined ⇒ demo data
}

export interface AppData {
  subjects: Subject[];
  sessions: ClassSession[];
  academicDays: AcademicDay[];
  predictions: Record<string, PredictionState>; // sessionId → state
  settings: AppSettings;
}
