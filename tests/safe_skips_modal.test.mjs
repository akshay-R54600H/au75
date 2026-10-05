/**
 * Verification test for Safe Skips Breakdown Modal UI redesign.
 * Run with: node tests/safe_skips_modal.test.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modalFilePath = path.resolve(__dirname, "../components/dashboard/StatBreakdownModal.tsx");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

console.log("=== Safe Skips Modal Redesign Verification ===");

const content = fs.readFileSync(modalFilePath, "utf-8");

// 1. Title and Header elements
assert(content.includes('title={tab === "safe-skips" ? "Safe Skips Breakdown" : "At Risk Subjects"}'), "Modal preserves title 'Safe Skips Breakdown'");
assert(content.includes('tab === "safe-skips"'), "Preserves Safe Skips tab selection");
assert(content.includes('tab === "at-risk"'), "Preserves At Risk tab selection");

// 2. Summary message
assert(
  content.includes("You have") &&
  content.includes("safe skip") &&
  content.includes("available across") &&
  content.includes("while staying at or above your"),
  "Preserves compact green summary message"
);

// 3. Redundant eyebrow heading removed
assert(!content.includes("Subjects you can skip ("), "Redundant 'Subjects you can skip' heading is removed");

// 4. Removed fields from safe subjects
// Check the safeSubjects mapping section:
const safeSubjectsSectionMatch = content.match(/\{safeSubjects\.map\([\s\S]*?\)\s*=>\s*\(([\s\S]*?)\)\)\}/);
assert(safeSubjectsSectionMatch !== null, "Found safeSubjects.map block");

if (safeSubjectsSectionMatch) {
  const cardJsx = safeSubjectsSectionMatch[1];

  // Disallowed items in subject card:
  assert(!cardJsx.includes("faculty"), "Faculty name is completely removed from card");
  assert(!cardJsx.includes("subject.code"), "Subject code is completely removed from card");
  assert(!cardJsx.includes("attended") && !cardJsx.includes("total"), "Attendance count like (attended/total) is completely removed from card");

  // Required items in subject card:
  assert(cardJsx.includes("{subject.name}"), "Subject name is prominent in card");
  assert(cardJsx.includes("Current:"), "Current attendance label is present");
  assert(cardJsx.includes("Can skip {verdict.skips}"), "Can skip indicator is present with prominent skip count");
  assert(cardJsx.includes("After skips:"), "After skips projected attendance is present");
  assert(cardJsx.includes("Manage skips in subject"), "Manage skips in subject action is present");
}

// 5. Zero skips collapsible section
assert(content.includes("Subjects with 0 skips remaining"), "Collapsed zero skips section is present");
assert(content.includes("showZeroSkips ? \"Hide\" : \"Show\""), "Show/Hide toggle control is present");
assert(content.includes("const [showZeroSkips, setShowZeroSkips] = useState(false);"), "Zero skips section is collapsed by default");

// 6. Footer Close button
assert(content.includes("Close\n          </button>") || content.includes("Close</button>"), "Close button present in modal footer");

console.log(`\n${"─".repeat(44)}\nTotal: ${passed + failed} | ✓ ${passed} passed | ✗ ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All Safe Skips Modal Redesign checks passed successfully!\n");
}
