import assert from "node:assert/strict";
import { availableThemes, isRestrictedTheme } from "../lib/themes.ts";

console.log("=== Student-only Theme Access ===");

const PUBLIC = ["system", "light", "dark", "sakura", "batman"];

assert.equal(isRestrictedTheme("lighthouse"), true, "Lighthouse is a restricted theme");
assert.equal(isRestrictedTheme("batman"), false, "Batman is open to everyone");

for (const id of ["pradeepbtech24@ced.alliance.edu.in", "pkrishibtech24@ced.alliance.edu.in"]) {
  const themes = await availableThemes(id);
  assert.ok(themes.includes("lighthouse"), `${id} can use Lighthouse`);
  // Case and whitespace from the login form don't matter.
  assert.ok((await availableThemes(`  ${id.toUpperCase()} `)).includes("lighthouse"), `${id} matches case-insensitively`);
}

for (const id of [undefined, "", "someone@ced.alliance.edu.in", "pradeepbtech24@ced.alliance.edu", "xpradeepbtech24@ced.alliance.edu.in"]) {
  assert.deepEqual(await availableThemes(id), PUBLIC, `${JSON.stringify(id)} sees only the public themes`);
}

console.log("  ✓ Lighthouse is offered only to the two allowed student IDs");
console.log("  ✓ Everyone else sees only the public themes\n");
