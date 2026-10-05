import assert from "node:assert/strict";
import { NAV_LINKS } from "../components/layout/nav.ts";
import { CalendarCheck } from "lucide-react";

console.log("=== Navbar 'Skips' Item Verification Tests ===");

// 1. Label and placement
assert.equal(NAV_LINKS.length, 4, "NAV_LINKS has 4 items");

const expectedLabels = ["Home", "Calendar", "Skips", "Settings"];
const expectedHrefs = ["/dashboard", "/calendar", "/skips", "/settings"];

for (let i = 0; i < expectedLabels.length; i++) {
  assert.equal(NAV_LINKS[i].label, expectedLabels[i], `Item ${i} label is ${expectedLabels[i]}`);
  assert.equal(NAV_LINKS[i].href, expectedHrefs[i], `Item ${i} href is ${expectedHrefs[i]}`);
}

// Ensure Subjects is not in navbar
assert.ok(!NAV_LINKS.some((item) => item.label === "Subjects"), "Subjects is removed from navbar");

// Ensure Settings is always last
const lastItem = NAV_LINKS[NAV_LINKS.length - 1];
assert.equal(lastItem.label, "Settings", "Settings option is always last in navbar");
assert.equal(lastItem.href, "/settings", "Settings option href is '/settings'");

// Ensure Skips uses CalendarCheck icon
const skipsItem = NAV_LINKS.find((item) => item.label === "Skips");
assert.ok(skipsItem, "Skips item exists in navbar");
assert.equal(skipsItem.icon, CalendarCheck, "Skips item uses CalendarCheck icon");

// 2. Uniqueness of href keys (prevents React key collision)
const hrefs = NAV_LINKS.map((item) => item.href);
const uniqueHrefs = new Set(hrefs);
assert.equal(uniqueHrefs.size, NAV_LINKS.length, "All href values are unique");

console.log("  ✓ Subjects is removed from navbar");
console.log("  ✓ Settings is kept as the last navbar option");
console.log("  ✓ Order is [Home, Calendar, Skips, Settings]");
console.log("  ✓ All navigation hrefs are unique");
console.log("\nAll Navbar Skips tests passed successfully!\n");
