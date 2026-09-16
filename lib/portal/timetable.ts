// ============================================================
// Alliance University Portal — Timetable Parser
//
// Real structure (verified from a captured authenticated page,
// 2026-08-09): a single dated table, one row per actual day:
//
//   <table id="example1">
//     <thead><tr>
//       <th>Sl.No</th> <th>Date</th> <th>Day</th>
//       <th>Session 1 <p>(08:00 - 08:55)</p></th> ... Session 10
//     </tr></thead>
//     <tbody>
//       <tr>
//         <td>1</td> <td>03/08/2026</td> <td>Monday</td>
//         <td> [session 1 cell] </td> ... [session 10 cell]
//       </tr>
//     </tbody>
//   </table>
//
// A filled session cell:
//   <input type="hidden" name="tp_name" value="Session 2">
//   <p data-toggle="tooltip"
//      title="Course Name: Discrete Mathematics
//             (E1CSA 316)
//             (Theory)">
//     DM ( <span title="Faculty Name:MS.NUPUR NANDI">NUN</span> )
//   </p>
//   <p style="font-size: 11px;">LT 407</p>
//
// Dates are real (dd/mm/yyyy), not a weekly pattern, so we parse the
// listed days verbatim — no future-session generation needed.
// ============================================================

import type { ClassSession } from "@/lib/models/types";

const CODE_OK_RE = /[A-Z]{2,8}\s*\d{3}/i;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Split an HTML fragment into the inner content of each <td>. */
function cells(html: string): string[] {
  const out: string[] = [];
  const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

/** Parse "dd/mm/yyyy" into an ISO "yyyy-mm-dd" string, or null. */
function parsePortalDate(cellHtml: string): string | null {
  const m = stripTags(cellHtml).match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

interface SessionMeta {
  name: string;
  code: string;
  faculty?: string;
  room?: string;
}

/** Parse a single session cell; returns null when the slot is empty. */
function parseSessionCell(cell: string): SessionMeta | null {
  const titleM =
    cell.match(/data-toggle="tooltip"\s+title="([\s\S]*?)"/i) ??
    cell.match(/title="([\s\S]*?)"/i);
  if (!titleM) return null;
  const title = titleM[1];

  // "Course Name: Discrete Mathematics\n(E1CSA 316)\n(Theory)"
  const courseM = title.match(
    /Course Name:\s*([\s\S]*?)\s*\(\s*([^()]*)\s*\)\s*\(\s*([^()]*)\s*\)/i
  );
  if (!courseM) return null;

  const name = courseM[1].replace(/\s+/g, " ").trim();
  const rawCode = courseM[2].trim();
  if (!CODE_OK_RE.test(rawCode)) return null; // empty slot "()"

  const facultyM = cell.match(/title="Faculty Name:([^"]*)"/i);
  const faculty = facultyM
    ? facultyM[1].replace(/\s+/g, " ").trim()
    : undefined;

  const roomM = cell.match(
    /<p[^>]*style="font-size:\s*11px;"[^>]*>([\s\S]*?)<\/p>/i
  );
  const room = roomM ? stripTags(roomM[1]).replace(/\s+/g, " ").trim() : undefined;

  return {
    name,
    code: rawCode.replace(/\s+/g, "").toLowerCase(),
    faculty: faculty || undefined,
    room: room || undefined,
  };
}

export function parseTimetable(html: string): ClassSession[] | null {
  const sessions: ClassSession[] = [];
  const today = todayISO();

  // Session start/end times from the <thead> headers
  // ("Session 1 <p>(08:00 - 08:55)</p>").
  const timeBySession = new Map<number, { start?: string; end?: string }>();
  const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
  let thM: RegExpExecArray | null;
  while ((thM = thRe.exec(html)) !== null) {
    const nRe = thM[1].match(/Session\s+(\d+)/i);
    if (!nRe) continue;
    const n = parseInt(nRe[1], 10);
    const tRe = thM[1].match(
      /\((\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})\)/
    );
    if (tRe) {
      timeBySession.set(n, {
        start: `${pad(parseInt(tRe[1], 10))}:${tRe[2]}`,
        end: `${pad(parseInt(tRe[3], 10))}:${tRe[4]}`,
      });
    } else {
      timeBySession.set(n, {});
    }
  }

  // The dated schedule lives in the first <tbody>.
  const tbodyM = /<tbody>([\s\S]*?)<\/tbody>/i.exec(html);
  if (!tbodyM) return null;

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowM: RegExpExecArray | null;
  while ((rowM = rowRe.exec(tbodyM[1])) !== null) {
    const rowCells = cells(rowM[1]);
    // rowCells[0] = Sl.No, [1] = Date, [2] = Day, [3..] = sessions
    if (rowCells.length < 3) continue;

    const dateStr = parsePortalDate(rowCells[1]);
    if (!dateStr) continue;
    const dayName = stripTags(rowCells[2]).replace(/\s+/g, " ").trim();
    if (!dayName) continue;

    for (let i = 3; i < rowCells.length; i++) {
      const meta = parseSessionCell(rowCells[i]);
      if (!meta) continue;

      const sessionNo = i - 2;
      const times = timeBySession.get(sessionNo) ?? {};

      sessions.push({
        id: `${dateStr}-${meta.code}-${sessionNo}`,
        date: dateStr,
        day: dayName,
        subjectId: `portal-${meta.code}`,
        subjectCode: meta.code.toUpperCase(),
        subjectName: meta.name,
        faculty: meta.faculty,
        session: sessionNo,
        startTime: times.start,
        endTime: times.end,
        room: meta.room,
        isFuture: dateStr >= today,
      });
    }
  }

  return sessions.length > 0 ? sessions : null;
}
