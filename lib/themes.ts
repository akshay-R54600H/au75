import type { ThemeId } from "@/lib/models/types";

export const THEMES: { id: ThemeId; name: string }[] = [
  { id: "system", name: "Auto" },
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
];

/** localStorage key mirrored by the layout pre-hydration script. */
export const THEME_STORAGE_KEY = "au75.theme";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}
