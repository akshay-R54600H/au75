// ============================================================
// Alliance University Portal — Attendance Parser
//
// Real structure (verified from a captured authenticated page,
// 2026-08-09). Each subject is one <tr> in the summary table:
//
//   <tr>
//     <td>1</td>
//     <td>Discrete Mathematics (E1CSA 316)</td>
//     <td>
//       <table>                       <!-- one row per attendance type -->
//         <tr>
//           <td>Theory</td> <td>3.0</td> <td>3.0</td>
//           <td><a>0.0</a></td> <td>100.0</td>
//         </tr>
//       </table>
//     </td>
//   </tr>
//
// The course cell is "<Name> (<CODE>)" so subject names come straight
// from the attendance page. The third cell holds a nested table whose
// rows are attendance types (Theory/Practical/...); Conducted and
// Present are summed across those rows for the subject totals.
// The trailing "Total" / "Total Percentage" rows have no code in
// their cells — they are skipped naturally.
// ============================================================

import type { Subject } from "@/lib/models/types";
import { topLevelRows, topLevelCells, stripTags } from "./htmlBlocks.ts";

const CODE_OK_RE = /[A-Z]{2,8}\s*\d{3}/i;

function toNum(s: string): number | null {
  const n = parseFloat(stripTags(s).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseAttendance(html: string): Subject[] | null {
  const subjects: Subject[] = [];

  for (const row of topLevelRows(html)) {
    const rowCells = topLevelCells(row.content);
    if (rowCells.length < 2) continue;

    // Find the course cell: its text ends with " (CODE)".
    const courseText = stripTags(rowCells[1]).replace(/\s+/g, " ").trim();
    let code = "";
    const parenRe = /\(([^()]*)\)/g;
    let parenM: RegExpExecArray | null;
    while ((parenM = parenRe.exec(courseText)) !== null) {
      const c = parenM[1].trim();
      if (CODE_OK_RE.test(c)) code = c;
    }
    if (!code) continue;

    const name =
      courseText.replace(/\([^()]*\)/g, " ").replace(/\s+/g, " ").trim() ||
      code;

    // Sum conducted/present across the nested attendance-type rows.
    let total = 0;
    let attended = 0;
    for (const inner of topLevelRows(row.content)) {
      const innerCells = topLevelCells(inner.content);
      if (innerCells.length < 3) continue;
      const conducted = toNum(innerCells[1]);
      const present = toNum(innerCells[2]);
      if (conducted == null || present == null) continue;
      total += conducted;
      attended += present;
    }
    if (total <= 0) continue;

    const codeClean = code.replace(/\s+/g, "");

    subjects.push({
      id: `portal-${codeClean.toLowerCase()}`,
      code: codeClean.toUpperCase(),
      name,
      attended,
      total,
    });
  }

  return subjects.length > 0 ? subjects : null;
}
