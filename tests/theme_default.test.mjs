import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== Default Theme Verification ===");

// Every user starts on Auto ("system") until they pick a theme themselves.
const mockData = fs.readFileSync(path.resolve("lib/mock/data.ts"), "utf8");
assert.match(mockData, /theme:\s*"system"/, "DEFAULT_SETTINGS.theme must be \"system\" (Auto)");

const themes = fs.readFileSync(path.resolve("lib/themes.ts"), "utf8");
assert.match(themes, /\{\s*id:\s*"system",\s*name:\s*"Auto"\s*\}/, "Auto theme option must exist");
assert.match(themes, /\{\s*id:\s*"batman",\s*name:\s*"Batman"\s*\}/, "Batman theme option must exist");

console.log("  ✓ Auto is the default theme for every user");
console.log("  ✓ Batman theme is available in the picker\n");
