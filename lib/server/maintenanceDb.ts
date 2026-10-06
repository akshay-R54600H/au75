// ============================================================
// Server-side persistent maintenance configuration using Supabase
// Falls back to persistent local disk & memory store if Supabase credentials are not provided.
// ============================================================

import fs from "node:fs";
import path from "node:path";

export interface MaintenanceRecord {
  id: string;
  maintenance_mode: boolean;
  maintenance_title: string;
  maintenance_message: string;
  updated_at: string;
  updated_by: string | null;
}

export interface MaintenanceDTO {
  maintenanceMode: boolean;
  title: string;
  message: string;
  updatedAt: string;
  updatedBy?: string | null;
  source: "supabase" | "local_disk" | "fallback_memory";
}

const DEFAULT_TITLE = "AU75 is under maintenance";
const DEFAULT_MESSAGE = "We're making a few improvements. Please check back soon.";

// Fallback in-memory state for local testing or when Supabase is not configured
const FALLBACK_SLOT = Symbol.for("au75.fallbackMaintenance");
const CACHE_SLOT = Symbol.for("au75.maintenanceCache");

interface CacheEntry {
  data: MaintenanceDTO;
  cachedAt: number;
}

function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    (Array.isArray(process.execArgv) && process.execArgv.includes("--test")) ||
    (Array.isArray(process.argv) && process.argv.some((arg) => arg.includes("test")))
  );
}

function getMaintenanceFilePath(): string {
  const baseDir = path.join(process.cwd(), ".data");
  const fileName = isTestEnvironment() ? "maintenance_test_store.json" : "maintenance_store.json";
  return path.join(baseDir, fileName);
}

let diskWriteSupported = true;

function loadMaintenanceFromDisk(): MaintenanceRecord | null {
  try {
    const filePath = getMaintenanceFilePath();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw.trim()) return null;
    return JSON.parse(raw) as MaintenanceRecord;
  } catch {
    return null;
  }
}

function saveMaintenanceToDisk(record: MaintenanceRecord): void {
  try {
    const filePath = getMaintenanceFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), "utf-8");
    diskWriteSupported = true;
  } catch {
    diskWriteSupported = false;
  }
}

export function isMaintenanceDiskPersisted(): boolean {
  return diskWriteSupported && !isTestEnvironment();
}

function getFallbackStore(): MaintenanceRecord {
  const g = globalThis as unknown as Record<symbol, MaintenanceRecord | undefined>;
  if (!g[FALLBACK_SLOT]) {
    const fromDisk = loadMaintenanceFromDisk();
    if (fromDisk) {
      g[FALLBACK_SLOT] = fromDisk;
    } else {
      g[FALLBACK_SLOT] = {
        id: "global",
        maintenance_mode: false,
        maintenance_title: DEFAULT_TITLE,
        maintenance_message: DEFAULT_MESSAGE,
        updated_at: new Date().toISOString(),
        updated_by: "system",
      };
      if (!isTestEnvironment()) {
        saveMaintenanceToDisk(g[FALLBACK_SLOT]!);
      }
    }
  }
  return g[FALLBACK_SLOT]!;
}

function getCache(): CacheEntry | null {
  const g = globalThis as unknown as Record<symbol, CacheEntry | undefined>;
  return g[CACHE_SLOT] || null;
}

function setCache(data: MaintenanceDTO): void {
  const g = globalThis as unknown as Record<symbol, CacheEntry | undefined>;
  g[CACHE_SLOT] = { data, cachedAt: Date.now() };
}

function invalidateCache(): void {
  const g = globalThis as unknown as Record<symbol, CacheEntry | undefined>;
  delete g[CACHE_SLOT];
}

/** Check if Supabase credentials are configured in server environment. */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Fetch current maintenance configuration. Uses a 2-second in-memory cache to handle high-frequency polls. */
export async function getMaintenanceConfig(forceFresh = false): Promise<MaintenanceDTO> {
  const cached = getCache();
  const CACHE_TTL_MS = 2000; // 2 seconds TTL

  if (!forceFresh && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    const mem = getFallbackStore();
    const result: MaintenanceDTO = {
      maintenanceMode: mem.maintenance_mode,
      title: mem.maintenance_title || DEFAULT_TITLE,
      message: mem.maintenance_message || DEFAULT_MESSAGE,
      updatedAt: mem.updated_at,
      updatedBy: mem.updated_by,
      source: isMaintenanceDiskPersisted() ? "local_disk" : "fallback_memory",
    };
    setCache(result);
    return result;
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, "");
    const res = await fetch(`${cleanUrl}/rest/v1/app_settings?id=eq.global&select=*`, {
      method: "GET",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      // Ensure Next.js doesn't cache this fetch
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[maintenance] Supabase fetch failed with status ${res.status}. Falling back to memory state.`);
      const mem = getFallbackStore();
      return {
        maintenanceMode: mem.maintenance_mode,
        title: mem.maintenance_title,
        message: mem.maintenance_message,
        updatedAt: mem.updated_at,
        updatedBy: mem.updated_by,
        source: "fallback_memory",
      };
    }

    const rows = (await res.json()) as MaintenanceRecord[];

    if (!rows || rows.length === 0) {
      // Seed initial row if table is empty
      const initialRow: MaintenanceRecord = {
        id: "global",
        maintenance_mode: false,
        maintenance_title: DEFAULT_TITLE,
        maintenance_message: DEFAULT_MESSAGE,
        updated_at: new Date().toISOString(),
        updated_by: "system",
      };

      await fetch(`${cleanUrl}/rest/v1/app_settings`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(initialRow),
        cache: "no-store",
      }).catch((e) => console.error("[maintenance] Failed to seed initial app_settings row:", e));

      const result: MaintenanceDTO = {
        maintenanceMode: initialRow.maintenance_mode,
        title: initialRow.maintenance_title,
        message: initialRow.maintenance_message,
        updatedAt: initialRow.updated_at,
        updatedBy: initialRow.updated_by,
        source: "supabase",
      };
      setCache(result);
      return result;
    }

    const record = rows[0];
    const result: MaintenanceDTO = {
      maintenanceMode: Boolean(record.maintenance_mode),
      title: record.maintenance_title || DEFAULT_TITLE,
      message: record.maintenance_message || DEFAULT_MESSAGE,
      updatedAt: record.updated_at || new Date().toISOString(),
      updatedBy: record.updated_by,
      source: "supabase",
    };

    setCache(result);
    return result;
  } catch (err) {
    console.error("[maintenance] Error contacting Supabase:", err);
    const mem = getFallbackStore();
    return {
      maintenanceMode: mem.maintenance_mode,
      title: mem.maintenance_title,
      message: mem.maintenance_message,
      updatedAt: mem.updated_at,
      updatedBy: mem.updated_by,
      source: "fallback_memory",
    };
  }
}

/** Update the global maintenance configuration (requires admin authorization). */
export async function updateMaintenanceConfig(params: {
  maintenanceMode?: boolean;
  title?: string;
  message?: string;
  updatedBy: string;
}): Promise<MaintenanceDTO> {
  const current = await getMaintenanceConfig(true);

  const newMode = params.maintenanceMode !== undefined ? params.maintenanceMode : current.maintenanceMode;
  const newTitle = (params.title !== undefined ? params.title.trim() : current.title) || DEFAULT_TITLE;
  const newMessage = (params.message !== undefined ? params.message.trim() : current.message) || DEFAULT_MESSAGE;
  const updatedAt = new Date().toISOString();

  // Update in-memory fallback regardless
  const mem = getFallbackStore();
  mem.maintenance_mode = newMode;
  mem.maintenance_title = newTitle;
  mem.maintenance_message = newMessage;
  mem.updated_at = updatedAt;
  mem.updated_by = params.updatedBy;

  saveMaintenanceToDisk(mem);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const cleanUrl = supabaseUrl.replace(/\/+$/, "");
      const res = await fetch(`${cleanUrl}/rest/v1/app_settings?id=eq.global`, {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          id: "global",
          maintenance_mode: newMode,
          maintenance_title: newTitle,
          maintenance_message: newMessage,
          updated_at: updatedAt,
          updated_by: params.updatedBy,
        }),
        cache: "no-store",
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[maintenance] Supabase PATCH failed status ${res.status}:`, errorText);
        throw new Error(`Failed to persist to Supabase (${res.status})`);
      }
    } catch (err) {
      console.error("[maintenance] Failed updating Supabase:", err);
      throw err;
    }
  }

  invalidateCache();

  const updatedResult: MaintenanceDTO = {
    maintenanceMode: newMode,
    title: newTitle,
    message: newMessage,
    updatedAt,
    updatedBy: params.updatedBy,
    source: supabaseUrl && serviceKey ? "supabase" : "fallback_memory",
  };

  setCache(updatedResult);
  return updatedResult;
}
