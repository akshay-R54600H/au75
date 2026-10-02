import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== Disclaimer Carousel Verification Test ===");

// 1. Read DisclaimerCarousel.tsx
const carouselFile = path.resolve("components/dashboard/DisclaimerCarousel.tsx");
assert.ok(fs.existsSync(carouselFile), "DisclaimerCarousel.tsx must exist");
const carouselContent = fs.readFileSync(carouselFile, "utf8");

// Verify exact cards and wording
assert.ok(carouselContent.includes('type: "nptel"'), "NPTEL card must exist");
assert.ok(carouselContent.includes('title: "NPTEL Notice"'), "Card 1 title must be NPTEL Notice");
assert.ok(
  carouselContent.includes(
    'message:\n      "Please do not consider NPTEL subject attendance, as regular classes are not conducted till the end of the semester."'
  ) ||
    carouselContent.includes(
      "Please do not consider NPTEL subject attendance, as regular classes are not conducted till the end of the semester."
    ),
  "NPTEL message must match exactly"
);

assert.ok(carouselContent.includes('type: "erp"'), "AU ERP card must exist");
assert.ok(carouselContent.includes('title: "AU ERP Data"'), "Card 2 title must be AU ERP Data");
assert.ok(
  carouselContent.includes(
    "AU75 only displays data from AU ERP. Any changes in AU ERP will reflect here."
  ),
  "AU ERP message must match exactly"
);

assert.ok(carouselContent.includes('type: "sync"'), "Sync card must exist");
assert.ok(carouselContent.includes('title: "Sync Notice"'), "Card 3 title must be Sync Notice");
assert.ok(
  carouselContent.includes(
    "Always sync to get the latest data. AU75 cannot update AU ERP data independently."
  ),
  "Sync message must match exactly"
);

// Verify stacked rolling animation logic
assert.ok(carouselContent.includes("translateY(-24px)"), "Must roll upward on exit");
assert.ok(carouselContent.includes("translateY(0px)"), "Top card must be at translateY(0px)");
assert.ok(carouselContent.includes("translateY(8px)"), "Second card must be at translateY(8px)");
assert.ok(carouselContent.includes("translateY(16px)"), "Third card must be at translateY(16px)");
assert.ok(carouselContent.includes("prefers-reduced-motion"), "Must support prefers-reduced-motion");
assert.ok(carouselContent.includes("onMouseEnter"), "Must support pause on hover");
assert.ok(carouselContent.includes("onMouseLeave"), "Must resume on mouse leave");

// Verify NptelNotice backward-compatibility export
const nptelFile = path.resolve("components/dashboard/NptelNotice.tsx");
assert.ok(fs.existsSync(nptelFile), "NptelNotice.tsx must exist");
const nptelContent = fs.readFileSync(nptelFile, "utf8");
assert.ok(
  nptelContent.includes('export { default } from "./DisclaimerCarousel";'),
  "NptelNotice must re-export DisclaimerCarousel"
);

// Verify page.tsx uses DisclaimerCarousel
const pageFile = path.resolve("app/dashboard/page.tsx");
const pageContent = fs.readFileSync(pageFile, "utf8");
assert.ok(
  pageContent.includes("DisclaimerCarousel"),
  "Dashboard page must render DisclaimerCarousel"
);

console.log("✓ All 14 verification criteria passed successfully!");
