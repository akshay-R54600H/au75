// ============================================================
// IndexedDB storage abstraction using idb
// Works in browser (web + Capacitor WebView)
// ============================================================

import { openDB, type IDBPDatabase } from "idb";
import type { AppData, AppSettings, PredictionState } from "@/lib/models/types";
import { MOCK_SUBJECTS, MOCK_SESSIONS, MOCK_ACADEMIC_DAYS, DEFAULT_SETTINGS } from "@/lib/mock/data";
import { isThemeId } from "@/lib/themes";

const DB_NAME = "attendance-predictor";
const DB_VERSION = 1;

type DB = IDBPDatabase;

let dbPromise: Promise<DB> | null = null;

function getDB(): Promise<DB> {
  if (typeof window === "undefined") return Promise.reject(new Error("No DB in SSR"));
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("subjects")) {
          db.createObjectStore("subjects", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("sessions")) {
          db.createObjectStore("sessions", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("academicDays")) {
          db.createObjectStore("academicDays", { keyPath: "date" });
        }
        if (!db.objectStoreNames.contains("predictions")) {
          db.createObjectStore("predictions", { keyPath: "sessionId" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

// ------------------------------------------------------------------
// Generic helpers
// ------------------------------------------------------------------

async function clearAndFill<T>(storeName: string, items: T[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(storeName, "readwrite");
  await tx.store.clear();
  for (const item of items) {
    await tx.store.put(item);
  }
  await tx.done;
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

export async function loadAppData(): Promise<AppData> {
  const db = await getDB();

  const [subjects, sessions, academicDays, predictionRows, settingsRows] =
    await Promise.all([
      db.getAll("subjects"),
      db.getAll("sessions"),
      db.getAll("academicDays"),
      db.getAll("predictions"),
      db.getAll("settings"),
    ]);

  const predictions: Record<string, PredictionState> = {};
  for (const row of predictionRows as { sessionId: string; state: PredictionState }[]) {
    predictions[row.sessionId] = row.state;
  }

  const settingsMap: Record<string, unknown> = {};
  for (const row of settingsRows as { key: string; value: unknown }[]) {
    settingsMap[row.key] = row.value;
  }

  const theme = settingsMap["theme"];
  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    attendanceTarget: (settingsMap["attendanceTarget"] as number) ?? DEFAULT_SETTINGS.attendanceTarget,
    requirement: (settingsMap["requirement"] as AppSettings["requirement"]) ?? DEFAULT_SETTINGS.requirement,
    theme: isThemeId(theme) ? theme : DEFAULT_SETTINGS.theme,
    showDecimals: (settingsMap["showDecimals"] as boolean) ?? false,
    milestones: (settingsMap["milestones"] as AppSettings["milestones"]) ?? [],
    lastSyncedAt: settingsMap["lastSyncedAt"] as string | undefined,
  };

  return {
    subjects: subjects.length > 0 ? subjects : MOCK_SUBJECTS,
    sessions: sessions.length > 0 ? sessions : MOCK_SESSIONS,
    academicDays: academicDays.length > 0 ? academicDays : MOCK_ACADEMIC_DAYS,
    predictions,
    settings,
  };
}

export async function saveSubjects(subjects: AppData["subjects"]): Promise<void> {
  await clearAndFill("subjects", subjects);
}

export async function saveSessions(sessions: AppData["sessions"]): Promise<void> {
  await clearAndFill("sessions", sessions);
}

export async function saveAcademicDays(days: AppData["academicDays"]): Promise<void> {
  await clearAndFill("academicDays", days);
}

export async function savePrediction(
  sessionId: string,
  state: PredictionState
): Promise<void> {
  const db = await getDB();
  await db.put("predictions", { sessionId, state });
}

export async function deletePrediction(sessionId: string): Promise<void> {
  const db = await getDB();
  await db.delete("predictions", sessionId);
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put("settings", { key, value });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("settings", "readwrite");
  for (const [key, value] of Object.entries(settings)) {
    await tx.store.put({ key, value });
  }
  await tx.done;
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear("subjects"),
    db.clear("sessions"),
    db.clear("academicDays"),
    db.clear("predictions"),
    // Don't clear settings — preserve preferences
  ]);
}

export async function exportData(): Promise<AppData> {
  return loadAppData();
}

export async function importData(data: AppData): Promise<void> {
  await clearAndFill("subjects", data.subjects);
  await clearAndFill("sessions", data.sessions);
  await clearAndFill("academicDays", data.academicDays);

  const predRows = Object.entries(data.predictions).map(([sessionId, state]) => ({
    sessionId,
    state,
  }));
  await clearAndFill("predictions", predRows);
  await saveSettings(data.settings);
}

/**
 * Merge incoming sync data while preserving existing prediction choices.
 * A prediction is preserved if the session still exists in the new data.
 */
export async function mergeSyncData(
  newSubjects: AppData["subjects"],
  newSessions: AppData["sessions"],
  newAcademicDays: AppData["academicDays"],
  existingPredictions: Record<string, PredictionState>
): Promise<void> {
  const db = await getDB();

  await clearAndFill("subjects", newSubjects);
  await clearAndFill("sessions", newSessions);
  await clearAndFill("academicDays", newAcademicDays);

  // Remove predictions for sessions that no longer exist
  const newSessionIds = new Set(newSessions.map((s) => s.id));
  const tx = db.transaction("predictions", "readwrite");
  for (const sessionId of Object.keys(existingPredictions)) {
    if (!newSessionIds.has(sessionId)) {
      await tx.store.delete(sessionId);
    }
  }
  await tx.done;
}
