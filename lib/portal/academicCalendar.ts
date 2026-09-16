// ============================================================
// Alliance University Portal — Academic Calendar Parser
//
// Parses working days, holidays, exams, breaks from
// the portal's academic calendar page.
// ============================================================

import type { AcademicDay, AcademicDayType } from "@/lib/models/types";

/**
 * Parse the academic calendar HTML.
 * Returns an array of AcademicDay entries sorted by date.
 */
export function parseAcademicCalendar(html: string): AcademicDay[] | null {
  if (typeof document === "undefined") {
    return parseCalendarRegex(html);
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const days = tryParseCalendarDOM(doc);
    if (days && days.length > 0) return days;
    return parseCalendarRegex(html);
  } catch {
    return parseCalendarRegex(html);
  }
}

function classifyDescription(text: string): AcademicDayType {
  const lower = text.toLowerCase();
  if (/holiday|public holiday|national|festival|pongal|diwali|eid|christmas|independence|republic|ganesh|onam|ugadi|holi|janmashtami|navaratri/i.test(text))
    return "holiday";
  if (/exam|test|assessment|cia|cat|fat|end.?semester|mid.?sem/i.test(text))
    return "exam";
  if (/break|vacation|recess|summer|winter|semester break/i.test(text))
    return "break";
  if (/working saturday|compensatory|make.?up/i.test(text))
    return "working";
  return "working";
}

function tryParseCalendarDOM(doc: Document): AcademicDay[] | null {
  const days: AcademicDay[] = [];

  // Look for tables with date + description columns
  const tables = Array.from(doc.querySelectorAll("table"));
  for (const table of tables) {
    const headers = Array.from(table.querySelectorAll("th")).map(
      (th) => th.textContent?.trim().toLowerCase() ?? ""
    );

    const hasDate = headers.some((h) => h.includes("date") || h.includes("day"));
    const hasDesc = headers.some(
      (h) => h.includes("event") || h.includes("description") || h.includes("remark") || h.includes("activity")
    );

    if (!hasDate) continue;

    const dateIdx = headers.findIndex((h) => h.includes("date") || h === "day");
    const descIdx = headers.findIndex(
      (h) => h.includes("event") || h.includes("description") || h.includes("remark") || h.includes("activity")
    );

    const rows = Array.from(table.querySelectorAll("tbody tr, tr")).filter(
      (tr) => tr.querySelectorAll("td").length >= 2
    );

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td")).map(
        (td) => td.textContent?.trim() ?? ""
      );
      if (cells.length < 2) continue;

      const dateStr = parsePortalDate(cells[dateIdx] ?? "");
      if (!dateStr) continue;

      const description = descIdx >= 0 ? cells[descIdx] : "";
      const type = classifyDescription(description);

      days.push({ date: dateStr, type, description: description || undefined });
    }
  }

  return days.length > 0 ? days.sort((a, b) => a.date.localeCompare(b.date)) : null;
}

function parseCalendarRegex(html: string): AcademicDay[] | null {
  const days: AcademicDay[] = [];
  const clean = html.replace(/<[^>]+>/g, " ");

  // Match date patterns: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD Month YYYY
  const dateRegex =
    /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b|\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/gi;

  const monthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  let m: RegExpExecArray | null;
  while ((m = dateRegex.exec(clean)) !== null) {
    let dateStr: string;
    if (m[1]) {
      // numeric: DD/MM/YYYY
      dateStr = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    } else {
      // text month
      const mon = monthMap[m[5].slice(0, 3).toLowerCase()];
      dateStr = `${m[6]}-${mon}-${m[4].padStart(2, "0")}`;
    }

    // Get surrounding context for description
    const ctx = clean.slice(Math.max(0, m.index - 30), m.index + 80).trim();
    const type = classifyDescription(ctx);

    days.push({ date: dateStr, type, description: ctx.slice(0, 60) || undefined });
  }

  return days.length > 0
    ? days
        .filter((d, i, arr) => arr.findIndex((x) => x.date === d.date) === i)
        .sort((a, b) => a.date.localeCompare(b.date))
    : null;
}

/**
 * Convert various date formats from the portal to YYYY-MM-DD.
 * Handles: DD-MM-YYYY, DD/MM/YYYY, DD Month YYYY, Month DD YYYY
 */
export function parsePortalDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  // DD Month YYYY
  const monthMap: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12",
    jan: "01", feb: "02", mar: "03", apr: "04",
    jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const dMonthY = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dMonthY) {
    const mon = monthMap[dMonthY[2].toLowerCase()];
    if (mon) return `${dMonthY[3]}-${mon}-${dMonthY[1].padStart(2, "0")}`;
  }

  return null;
}
