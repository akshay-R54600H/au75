"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  AppData,
  AppSettings,
  PredictionState,
  ClassSession,
} from "@/lib/models/types";
import {
  loadAppData,
  savePrediction,
  saveSettings,
  clearAllData,
  exportData,
  importData,
} from "@/lib/storage/db";
import { MOCK_SUBJECTS, MOCK_SESSIONS, MOCK_ACADEMIC_DAYS, DEFAULT_SETTINGS } from "@/lib/mock/data";
import { THEME_STORAGE_KEY } from "@/lib/themes";
import { todayISO } from "@/lib/calculations/dates";

interface AppState extends AppData {
  isLoading: boolean;
  isOffline: boolean;
}

type Action =
  | { type: "LOAD_SUCCESS"; payload: AppData }
  | { type: "LOAD_ERROR" }
  | { type: "SET_PREDICTIONS"; entries: Record<string, PredictionState> }
  | { type: "UPDATE_SETTINGS"; settings: Partial<AppSettings> }
  | { type: "CLEAR_DATA" }
  | { type: "SET_OFFLINE"; offline: boolean };

/** `isFuture` is computed at sync time; refresh it against today's date. */
function refreshFuture(sessions: ClassSession[]): ClassSession[] {
  const today = todayISO();
  return sessions.map((s) => ({ ...s, isFuture: s.date >= today }));
}

const demoData: AppData = {
  subjects: MOCK_SUBJECTS,
  sessions: MOCK_SESSIONS,
  academicDays: MOCK_ACADEMIC_DAYS,
  predictions: {},
  settings: DEFAULT_SETTINGS,
};

const initialState: AppState = { ...demoData, isLoading: true, isOffline: false };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOAD_SUCCESS":
      return {
        ...state,
        ...action.payload,
        sessions: refreshFuture(action.payload.sessions),
        isLoading: false,
      };
    case "LOAD_ERROR":
      return { ...state, ...demoData, isLoading: false };
    case "SET_PREDICTIONS":
      return { ...state, predictions: { ...state.predictions, ...action.entries } };
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "CLEAR_DATA":
      return {
        ...state,
        subjects: MOCK_SUBJECTS,
        sessions: MOCK_SESSIONS,
        academicDays: MOCK_ACADEMIC_DAYS,
        predictions: {},
        settings: { ...state.settings, lastSyncedAt: undefined },
      };
    case "SET_OFFLINE":
      return { ...state, isOffline: action.offline };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  /** True until the first successful portal sync (or import). */
  isDemo: boolean;
  setPrediction: (sessionId: string, predState: PredictionState) => void;
  setPredictions: (entries: Record<string, PredictionState>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  clearData: () => void;
  exportAppData: () => Promise<AppData>;
  importAppData: (data: AppData) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    loadAppData()
      .then((data) => dispatch({ type: "LOAD_SUCCESS", payload: data }))
      .catch(() => dispatch({ type: "LOAD_ERROR" }));
  }, []);

  // Apply theme to <html data-theme> and mirror it to localStorage so the
  // layout's pre-hydration script can avoid a flash.
  useEffect(() => {
    const theme = state.settings.theme;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* private mode etc. */
    }
  }, [state.settings.theme]);

  useEffect(() => {
    const on = () => dispatch({ type: "SET_OFFLINE", offline: false });
    const off = () => dispatch({ type: "SET_OFFLINE", offline: true });
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    dispatch({ type: "SET_OFFLINE", offline: !navigator.onLine });
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const setPredictions = useCallback((entries: Record<string, PredictionState>) => {
    dispatch({ type: "SET_PREDICTIONS", entries });
    for (const [id, s] of Object.entries(entries)) savePrediction(id, s).catch(console.error);
  }, []);

  const setPrediction = useCallback(
    (sessionId: string, predState: PredictionState) => setPredictions({ [sessionId]: predState }),
    [setPredictions]
  );

  const settingsRef = React.useRef(state.settings);
  settingsRef.current = state.settings;
  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    dispatch({ type: "UPDATE_SETTINGS", settings });
    saveSettings({ ...settingsRef.current, ...settings }).catch(console.error);
  }, []);

  const clearData = useCallback(() => {
    dispatch({ type: "CLEAR_DATA" });
    clearAllData().catch(console.error);
    saveSettings({ ...settingsRef.current, lastSyncedAt: undefined }).catch(console.error);
  }, []);

  const exportAppData = useCallback(() => exportData(), []);

  const importAppData = useCallback(async (data: AppData) => {
    await importData(data);
    dispatch({ type: "LOAD_SUCCESS", payload: data });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      isDemo: !state.settings.lastSyncedAt,
      setPrediction,
      setPredictions,
      updateSettings,
      clearData,
      exportAppData,
      importAppData,
    }),
    [state, setPrediction, setPredictions, updateSettings, clearData, exportAppData, importAppData]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
