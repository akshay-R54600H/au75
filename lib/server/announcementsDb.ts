// ============================================================
// Server-side admin announcements (disclaimers, notices, news) using Supabase.
// Falls back to a local disk & memory store if Supabase credentials are not
// provided — same approach as maintenanceDb.ts.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  isAnnouncementIcon,
  isAnnouncementType,
  type AnnouncementIcon,
  type AnnouncementType,
} from "../announcements.ts";

export interface AnnouncementRecord {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  /** Chosen symbol; null uses the type's default icon. Absent on older rows. */
  icon?: AnnouncementIcon | null;
  enabled: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface AnnouncementDTO {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  icon: AnnouncementIcon | null;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface AnnouncementInput {
  title?: string;
  message?: string;
  type?: string;
  /** Symbol key, or null to use the type's default icon. */
  icon?: string | null;
  enabled?: boolean;
  /** ISO timestamp, or null to clear. */
  expiresAt?: string | null;
}

const TABLE = "app_announcements";
const TITLE_MAX = 80;
const MESSAGE_MAX = 400;

const FALLBACK_SLOT = Symbol.for("au75.fallbackAnnouncements");
const CACHE_SLOT = Symbol.for("au75.announcementsCache");
const CACHE_TTL_MS = 5000;

interface CacheEntry {
  data: AnnouncementDTO[];
  cachedAt: number;
}

export class AnnouncementValidationError extends Error {}
export class AnnouncementNotFoundError extends Error {}

/** Message for a Supabase table created before the `icon` column existed. */
const ICON_COLUMN_MISSING =
  "Symbols need a one-time database update: run the 'Admin Announcements' section of supabase/schema.sql in Supabase, then try again.";

/** PostgREST rejects writes to a column the table doesn't have (e.g. PGRST204). */
function isMissingIconColumn(status: number, body: string): boolean {
  return status === 400 && /'icon' column|column "icon"|icon.*schema cache/i.test(body);
}

function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    (Array.isArray(process.execArgv) && process.execArgv.includes("--test")) ||
    (Array.isArray(process.argv) && process.argv.some((arg) => arg.includes("test")))
  );
}

function getFilePath(): string {
  const fileName = isTestEnvironment() ? "announcements_test_store.json" : "announcements_store.json";
  return path.join(process.cwd(), ".data", fileName);
}

function loadFromDisk(): AnnouncementRecord[] {
  if (isTestEnvironment()) return [];
  try {
    const filePath = getFilePath();
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return Array.isArray(parsed) ? (parsed as AnnouncementRecord[]) : [];
  } catch {
    return [];
  }
}

function saveToDisk(records: AnnouncementRecord[]): void {
  if (isTestEnvironment()) return;
  try {
    const filePath = getFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf-8");
  } catch {
    // Read-only filesystem (e.g. serverless) — memory store still works for this instance.
  }
}

function getFallbackStore(): AnnouncementRecord[] {
  const g = globalThis as unknown as Record<symbol, AnnouncementRecord[] | undefined>;
  if (!g[FALLBACK_SLOT]) g[FALLBACK_SLOT] = loadFromDisk();
  return g[FALLBACK_SLOT]!;
}

function getCache(): CacheEntry | null {
  const g = globalThis as unknown as Record<symbol, CacheEntry | undefined>;
  return g[CACHE_SLOT] || null;
}

function setCache(data: AnnouncementDTO[]): void {
  const g = globalThis as unknown as Record<symbol, CacheEntry | undefined>;
  g[CACHE_SLOT] = { data, cachedAt: Date.now() };
}

function invalidateCache(): void {
  const g = globalThis as unknown as Record<symbol, CacheEntry | undefined>;
  delete g[CACHE_SLOT];
}

function supabase(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/+$/, ""), key } : null;
}

async function supabaseFetch(pathAndQuery: string, init: RequestInit & { prefer?: string } = {}): Promise<Response> {
  const sb = supabase()!;
  const { prefer, ...rest } = init;
  return fetch(`${sb.url}/rest/v1/${pathAndQuery}`, {
    ...rest,
    headers: {
      apikey: sb.key,
      Authorization: `Bearer ${sb.key}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    cache: "no-store",
  });
}

/**
 * Insert/update via PostgREST. If the table predates the `icon` column, a
 * write without a chosen symbol is retried without the field (nothing lost);
 * a write with a symbol explains the one-time schema update instead.
 */
async function supabaseWrite(pathAndQuery: string, method: "POST" | "PATCH", body: Record<string, unknown>): Promise<Response> {
  const send = (payload: Record<string, unknown>) =>
    supabaseFetch(pathAndQuery, { method, prefer: "return=representation", body: JSON.stringify(payload) });

  const res = await send(body);
  if (res.ok || !("icon" in body) || !isMissingIconColumn(res.status, await res.clone().text())) return res;

  if (body.icon != null) throw new AnnouncementValidationError(ICON_COLUMN_MISSING);
  const withoutIcon = { ...body };
  delete withoutIcon.icon;
  return send(withoutIcon);
}

function toDTO(r: AnnouncementRecord): AnnouncementDTO {
  return {
    id: r.id,
    title: r.title,
    message: r.message,
    type: isAnnouncementType(r.type) ? r.type : "announcement",
    icon: isAnnouncementIcon(r.icon) ? r.icon : null,
    enabled: Boolean(r.enabled),
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    updatedBy: r.updated_by,
  };
}

function newestFirst(a: AnnouncementDTO, b: AnnouncementDTO): number {
  return b.createdAt.localeCompare(a.createdAt);
}

/** Enabled and not yet expired at `now`. */
export function isAnnouncementActive(a: Pick<AnnouncementDTO, "enabled" | "expiresAt">, now = Date.now()): boolean {
  if (!a.enabled) return false;
  if (!a.expiresAt) return true;
  const t = Date.parse(a.expiresAt);
  return Number.isNaN(t) || t > now;
}

/** Validate and normalise admin input. `partial` allows omitting fields (for updates). */
function validate(input: AnnouncementInput, partial: boolean): Partial<AnnouncementRecord> {
  const out: Partial<AnnouncementRecord> = {};

  if (input.title !== undefined || !partial) {
    const title = (input.title ?? "").trim();
    if (!title) throw new AnnouncementValidationError("Title is required.");
    if (title.length > TITLE_MAX) throw new AnnouncementValidationError(`Title must be ${TITLE_MAX} characters or fewer.`);
    out.title = title;
  }
  if (input.message !== undefined || !partial) {
    const message = (input.message ?? "").trim();
    if (!message) throw new AnnouncementValidationError("Message is required.");
    if (message.length > MESSAGE_MAX) throw new AnnouncementValidationError(`Message must be ${MESSAGE_MAX} characters or fewer.`);
    out.message = message;
  }
  if (input.type !== undefined || !partial) {
    const type = input.type ?? "announcement";
    if (!isAnnouncementType(type)) throw new AnnouncementValidationError("Invalid announcement type.");
    out.type = type;
  }
  if (input.icon !== undefined) {
    if (input.icon === null || input.icon === "") {
      out.icon = null;
    } else if (isAnnouncementIcon(input.icon)) {
      out.icon = input.icon;
    } else {
      throw new AnnouncementValidationError("Invalid symbol.");
    }
  } else if (!partial) {
    out.icon = null;
  }

  if (input.enabled !== undefined) out.enabled = Boolean(input.enabled);
  else if (!partial) out.enabled = true;

  if (input.expiresAt !== undefined) {
    if (input.expiresAt === null || input.expiresAt === "") {
      out.expires_at = null;
    } else {
      const t = Date.parse(input.expiresAt);
      if (Number.isNaN(t)) throw new AnnouncementValidationError("Invalid expiry date.");
      out.expires_at = new Date(t).toISOString();
    }
  } else if (!partial) {
    out.expires_at = null;
  }

  return out;
}

/** Every announcement (admin view), newest first. */
export async function listAnnouncements(forceFresh = false): Promise<AnnouncementDTO[]> {
  const cached = getCache();
  if (!forceFresh && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.data;

  if (!supabase()) {
    const result = getFallbackStore().map(toDTO).sort(newestFirst);
    setCache(result);
    return result;
  }

  try {
    const res = await supabaseFetch(`${TABLE}?select=*&order=created_at.desc`);
    if (!res.ok) {
      console.warn(`[announcements] Supabase fetch failed with status ${res.status}. Serving last known list.`);
      return cached?.data ?? [];
    }
    const result = ((await res.json()) as AnnouncementRecord[]).map(toDTO);
    setCache(result);
    return result;
  } catch (err) {
    console.error("[announcements] Error contacting Supabase:", err);
    return cached?.data ?? [];
  }
}

/** Enabled, unexpired announcements for the student dashboard. */
export async function listActiveAnnouncements(): Promise<AnnouncementDTO[]> {
  const now = Date.now();
  return (await listAnnouncements()).filter((a) => isAnnouncementActive(a, now));
}

export async function createAnnouncement(input: AnnouncementInput, updatedBy: string): Promise<AnnouncementDTO> {
  const fields = validate(input, false);
  const now = new Date().toISOString();
  const record: AnnouncementRecord = {
    id: randomUUID(),
    title: fields.title!,
    message: fields.message!,
    type: fields.type!,
    icon: fields.icon ?? null,
    enabled: fields.enabled!,
    expires_at: fields.expires_at ?? null,
    created_at: now,
    updated_at: now,
    updated_by: updatedBy,
  };

  if (supabase()) {
    const res = await supabaseWrite(TABLE, "POST", { ...record });
    if (!res.ok) {
      console.error(`[announcements] Supabase insert failed ${res.status}:`, await res.text());
      throw new Error(`Failed to save announcement (${res.status})`);
    }
  } else {
    const store = getFallbackStore();
    store.push(record);
    saveToDisk(store);
  }

  invalidateCache();
  return toDTO(record);
}

export async function updateAnnouncement(
  id: string,
  input: AnnouncementInput,
  updatedBy: string
): Promise<AnnouncementDTO> {
  const fields = { ...validate(input, true), updated_at: new Date().toISOString(), updated_by: updatedBy };

  let updated: AnnouncementRecord | undefined;
  if (supabase()) {
    const res = await supabaseWrite(`${TABLE}?id=eq.${encodeURIComponent(id)}`, "PATCH", fields);
    if (!res.ok) {
      console.error(`[announcements] Supabase update failed ${res.status}:`, await res.text());
      throw new Error(`Failed to update announcement (${res.status})`);
    }
    updated = ((await res.json()) as AnnouncementRecord[])[0];
  } else {
    const store = getFallbackStore();
    const existing = store.find((r) => r.id === id);
    if (existing) {
      Object.assign(existing, fields);
      saveToDisk(store);
      updated = existing;
    }
  }

  if (!updated) throw new AnnouncementNotFoundError("Announcement not found.");
  invalidateCache();
  return toDTO(updated);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  if (supabase()) {
    const res = await supabaseFetch(`${TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      prefer: "return=representation",
    });
    if (!res.ok) {
      console.error(`[announcements] Supabase delete failed ${res.status}:`, await res.text());
      throw new Error(`Failed to delete announcement (${res.status})`);
    }
    if (((await res.json()) as unknown[]).length === 0) throw new AnnouncementNotFoundError("Announcement not found.");
  } else {
    const store = getFallbackStore();
    const index = store.findIndex((r) => r.id === id);
    if (index === -1) throw new AnnouncementNotFoundError("Announcement not found.");
    store.splice(index, 1);
    saveToDisk(store);
  }
  invalidateCache();
}
