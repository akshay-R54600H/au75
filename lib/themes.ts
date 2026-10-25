import type { ThemeId } from "@/lib/models/types";

export const THEMES: { id: ThemeId; name: string }[] = [
  { id: "system", name: "Auto" },
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
  { id: "sakura", name: "Sakura" },
  { id: "batman", name: "Batman" },
  { id: "lighthouse", name: "Lighthouse" },
];

/** localStorage key mirrored by the layout pre-hydration script. */
export const THEME_STORAGE_KEY = "au75.theme";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

/**
 * Themes only certain students may use, keyed to SHA-256 hashes of their
 * lower-cased portal IDs (so the IDs themselves aren't shipped in the bundle).
 * This is a cosmetic unlock checked on the device, not a security boundary.
 */
const RESTRICTED_THEMES: Partial<Record<ThemeId, string[]>> = {
  lighthouse: [
    "4ad073f683765989d9787a5973cebfb039ad825d0892a82b65becb0c071d4957",
    "00104a8d6d5056d0f2f77ebd227d573f60c34d02af62e484e0dd3816e3dd45e4",
  ],
};

export function isRestrictedTheme(id: ThemeId): boolean {
  return id in RESTRICTED_THEMES;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Themes this student may pick (unrestricted ones plus any unlocked for their ID). */
export async function availableThemes(studentId: string | undefined): Promise<ThemeId[]> {
  let hash: string | null = null;
  if (studentId && typeof crypto !== "undefined" && crypto.subtle) {
    try {
      hash = await sha256Hex(studentId.trim().toLowerCase());
    } catch {
      hash = null;
    }
  }
  return THEMES.filter((t) => {
    const allowed = RESTRICTED_THEMES[t.id];
    return !allowed || (hash !== null && allowed.includes(hash));
  }).map((t) => t.id);
}
