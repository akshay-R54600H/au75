// ============================================================
// Depth-aware HTML row/cell extraction
//
// The AU portal pages nest <table> elements inside <td> cells and
// <tr> rows (e.g. attendance type tables). A lazy regex like
// /<tr...>([\s\S]*?)<\/tr>/ stops at the FIRST </tr>, truncating an
// outer row at its first nested table row. These helpers instead
// count <tr/</tr> (and <td/</td>) to pair each opening tag with its
// matching close, so nested tables stay inside their parent row.
// ============================================================

const TR_RE = /<tr\b|<\/tr>/gi;
const TD_RE = /<td\b|<\/td>/gi;

export interface HtmlBlock {
  /** Absolute index of the opening "<tr". */
  open: number;
  /** Absolute index of the matching "</tr>" ("<" position). */
  close: number;
  /** Full span including both tags. */
  html: string;
  /** Inner content between the opening and closing tags. */
  content: string;
}

/**
 * Return the TOP-LEVEL <tr> blocks inside `html` starting at `from`.
 * Nested <tr> elements (inside <table> within a <td>) stay contained
 * inside their parent block.
 */
export function topLevelRows(html: string, from = 0): HtmlBlock[] {
  const out: HtmlBlock[] = [];
  let depth = 0;
  let open = -1;
  let m: RegExpExecArray | null;
  TR_RE.lastIndex = from;
  while ((m = TR_RE.exec(html)) !== null) {
    if (m[0] === "<tr") {
      if (depth === 0) open = m.index;
      depth++;
    } else {
      depth--;
      if (depth === 0 && open !== -1) {
        const close = m.index;
        const gt = html.indexOf(">", open);
        out.push({
          open,
          close,
          html: html.slice(open, close + 5),
          content: html.slice(gt + 1, close),
        });
        open = -1;
      }
    }
  }
  return out;
}

/**
 * Return the TOP-LEVEL <td> inner contents inside `html`.
 * Nested <td> elements (inside nested tables) stay contained inside
 * their parent cell.
 */
export function topLevelCells(html: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let open = -1;
  let m: RegExpExecArray | null;
  TD_RE.lastIndex = 0;
  while ((m = TD_RE.exec(html)) !== null) {
    if (m[0] === "<td") {
      if (depth === 0) open = m.index;
      depth++;
    } else {
      depth--;
      if (depth === 0 && open !== -1) {
        const close = m.index;
        const gt = html.indexOf(">", open);
        out.push(html.slice(gt + 1, close));
        open = -1;
      }
    }
  }
  return out;
}

export function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
