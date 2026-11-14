// Rebuild formulas that the PDF text layer scrambles (stacked fractions, subscripts).
//
// pdf.js returns text items in PAINT order, not reading order, and starts a new line whenever
// the baseline jumps. A display formula like 1/v + 1/u = 1/f is painted numerators first, then
// denominators, then operators, so unpdf gives "1 1 1 ⏎ v u f ⏎ + = (9.1)"; Plaster of Paris
// CaSO4·½H2O became "( 4 2 1 CaSO . H O 2 )". Every glyph still has its position, so:
//   1. link stream lines (within a few lines of each other in the stream) that have items
//      closer than a normal line gap (0.85 x font size; body lines are ~1.2 x apart) and
//      touching horizontally (so side-by-side columns and captions never link);
//   2. rebuild each linked group by x position: full-size runs stacked above/below each other
//      with operator text between them become "num/den"; subscripts stay inline (CaSO4).
// Lines that link with nothing are returned unchanged, so ordinary text keeps its order.

/** One pdf.js text item. x/y = baseline start (PDF units, y grows upward); w = advance width. */
export interface TextItem { str: string; x: number; y: number; w: number; size: number }
/** A stream line (items between pdf.js end-of-line marks). */
export interface ItemLine { items: TextItem[] }
export interface RebuiltLine { text: string; y: number | null }

const LINK_DY = 0.85;   // max baseline distance (x the SMALLER font size) between linked items
const LINK_WINDOW = 6;  // max distance in the stream between linked lines
const LINK_DX = 1.0;    // max horizontal gap (x font size): side-by-side columns never link
const LEVEL_TOL = 1.0;  // baseline tolerance (PDF units) for one level
const FRACTION_DY: [number, number] = [0.9, 2.1]; // numerator-denominator distance (x size)
const MAX_PART = 40;    // visible characters in one numerator / denominator ("Speed of light in medium 1")

const FOOTER = /Reprint\s+\d{4}-\d{2}/;

const visible = (s: string) => s.replace(/\s/g, '').length;

interface LineInfo { base: number; size: number; visible: number; x0: number; x1: number }

function lineInfo(line: ItemLine): LineInfo | null {
  let best: TextItem | null = null;
  let total = 0;
  let x0 = Infinity;
  let x1 = -Infinity;
  for (const it of line.items) {
    const v = visible(it.str);
    if (!v) continue;
    total += v;
    x0 = Math.min(x0, it.x);
    x1 = Math.max(x1, it.x + it.w);
    if (!best || v > visible(best.str)) best = it;
  }
  return best ? { base: best.y, size: best.size, visible: total, x0, x1 } : null;
}

/**
 * Two stream lines are one visual line when some item of one sits next to some item of the
 * other: baselines within LINK_DY x the smaller font size (a big icon glyph like the "?" of a
 * question box must not reach far) and at most LINK_DX x size apart horizontally (columns side
 * by side never link). Items are compared, not lines: one stream line often holds items on
 * several baselines ("n21= Speed of light in medium 1" = main line + a numerator).
 */
function itemsTouch(a: readonly TextItem[], b: readonly TextItem[]): boolean {
  for (const p of a) {
    if (!visible(p.str)) continue;
    for (const q of b) {
      if (!visible(q.str)) continue;
      const size = Math.min(p.size, q.size);
      const gap = Math.max(p.x, q.x) - Math.min(p.x + p.w, q.x + q.w); // < 0 when they overlap
      if (Math.abs(p.y - q.y) <= LINK_DY * size && gap <= LINK_DX * size) return true;
    }
  }
  return false;
}

/** Group indices of lines that belong to one visual formula line (union-find). */
export function linkFormulaLines(lines: readonly ItemLine[]): number[][] {
  const parent = lines.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j <= Math.min(lines.length - 1, i + LINK_WINDOW); j++) {
      if (itemsTouch(lines[i].items, lines[j].items)) parent[find(j)] = find(i);
    }
  }
  const groups = new Map<number, number[]>();
  lines.forEach((_, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), i]);
  });
  return [...groups.values()].filter((g) => g.length > 1);
}

interface Token { text: string; x0: number; x1: number; y: number; size: number; item: number; word: number }
interface Span { x0: number; x1: number }

/**
 * Split items into words (and the spaces between them). pdf.js gives only an item's start and
 * total width, so each word's position is estimated from standard Times-Roman glyph widths.
 * Formula items have wide "glue" spaces where a subscript is drawn ("H O" with the 2 in the
 * gap): those spaces take any extra width.
 */
function tokens(items: readonly TextItem[]): { words: Token[]; spaces: Span[] } {
  const words: Token[] = [];
  const spaces: Span[] = [];
  items.forEach((it, item) => {
    const width = (s: string) => [...s].reduce((n, c) => n + glyphWidth(c), 0) * it.size / 1000;
    const natural = width(it.str);
    const spaceChars = it.str.length - visible(it.str);
    const extra = spaceChars && it.w > natural ? (it.w - natural) / spaceChars : 0; // glue
    const scale = extra || !natural ? 1 : it.w / natural;
    let x = it.x;
    let word = 0;
    for (const m of it.str.matchAll(/\S+|\s+/g)) {
      const isWord = /\S/.test(m[0]);
      const span = { x0: x, x1: x + width(m[0]) * scale + (isWord ? 0 : extra * m[0].length) };
      x = span.x1;
      if (isWord) words.push({ text: m[0], item, word: word++, y: it.y, size: it.size, ...span });
      else spaces.push(span);
    }
  });
  return { words, spaces };
}

// Adobe Times-Roman glyph widths (1/1000 em) from the Core-14 AFM metrics bundled in pdf.js.
const UPPER = [722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722, 556, 722, 667, 556, 611, 722, 722, 944, 722, 722, 611];
const LOWER = [444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500, 500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444];
const OTHER: Record<string, number> = {
  ' ': 250, '(': 333, ')': 333, '[': 333, ']': 333, '.': 250, ',': 250, ':': 278, ';': 278, '/': 278,
  "'": 333, '′': 333, '-': 333, '–': 500, '—': 1000, '+': 564, '=': 564, '−': 564, '×': 564, '½': 750, '→': 1000,
};

function glyphWidth(c: string): number {
  if (c >= 'A' && c <= 'Z') return UPPER[c.charCodeAt(0) - 65];
  if (c >= 'a' && c <= 'z') return LOWER[c.charCodeAt(0) - 97];
  return OTHER[c] ?? 500; // digits and anything else
}

const OPERATOR = /^[+−–=×÷→∝≈<>±]$/;

/**
 * Join tokens left to right with simple spacing rules:
 *   - a subscript / superscript joins the glyph before it (H2O, SO4, Na+, e–);
 *   - an operator gets a space on both sides (a small "+"/"–" is a charge, not an operator);
 *   - otherwise a space where the item had one, where the PDF has a real space (not glue
 *     under another glyph), or across a word-sized gap (wider after a fraction: "½H2O").
 */
function joinTokens(ts: readonly Token[], spaces: readonly Span[] = [], body = Math.max(...ts.map((t) => t.size))): string {
  const realSpaces = spaces.filter((s) => !ts.some((t) => t.x0 < s.x1 - 0.5 && t.x1 > s.x0 + 0.5));
  const small = (t: Token) => t.size < 0.8 * body;
  let s = '';
  ts.forEach((t, i) => {
    const p = ts[i - 1];
    if (p) {
      const nextWord = p.item === t.item && t.word === p.word + 1;
      const gap = t.x0 - p.x1;
      const space = small(t) ? nextWord : nextWord ||
        (OPERATOR.test(p.text) && !small(p)) || OPERATOR.test(t.text) ||
        realSpaces.some((sp) => sp.x0 >= p.x1 - 1 && sp.x1 <= t.x0 + 1) ||
        gap > (p.item < 0 ? 0.5 : 0.3) * Math.max(p.size, t.size);
      if (space) s += ' ';
    }
    s += t.text;
  });
  return s;
}

/** Left to right; a subscript stacked under a superscript comes first (SO4 2–, not SO2–4). */
function byX(a: Token, b: Token): number {
  return Math.abs(a.x0 - b.x0) < 1.5 && a.size === b.size && a.y !== b.y ? a.y - b.y : a.x0 - b.x0;
}

type Run = { ts: Token[]; x0: number; x1: number; y: number; size: number };

function runsOf(level: Token[]): Run[] {
  const sorted = [...level].sort(byX);
  const runs: Run[] = [];
  for (const t of sorted) {
    const r = runs.at(-1);
    const last = r?.ts.at(-1);
    const sameText = !!last && last.item === t.item && t.word === last.word + 1; // "Speed of light"
    if (r && (sameText || t.x0 - r.x1 <= 0.6 * t.size)) {
      r.ts.push(t);
      r.x1 = Math.max(r.x1, t.x1);
    } else runs.push({ ts: [t], x0: t.x0, x1: t.x1, y: t.y, size: t.size });
  }
  return runs;
}

const part = (r: Run, spaces: readonly Span[], body: number) => {
  const t = joinTokens(r.ts, spaces, body);
  return /[\s+−–-]/.test(t) && !/^\(.*\)$/.test(t) ? `(${t})` : t;
};

/** The font size most characters use (big brackets or icons must not set the scale). */
function bodySize(ts: readonly Token[]): number {
  const chars = new Map<number, number>();
  for (const t of ts) chars.set(Math.round(t.size * 2) / 2, (chars.get(Math.round(t.size * 2) / 2) ?? 0) + t.text.length);
  return [...chars.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}

/**
 * Text of one visual line rebuilt from its items, reading left to right; null when the
 * items are two rows of ordinary text (e.g. a drop-cap letter linked two body lines), which
 * must keep their stream order.
 */
export function rebuildFormulaText(items: readonly TextItem[]): string | null {
  const { words: all, spaces } = tokens(items);
  if (!all.length) return '';
  const maxSize = bodySize(all);
  // Words in a much bigger font are a heading or a box title ("Do You Know?"), not a formula
  // (big brackets have no letters).
  if (all.some((t) => t.size > 1.25 * maxSize && /\p{L}{2}/u.test(t.text))) return null;
  // Levels of full-size text (subscripts / superscripts are smaller and stay inline).
  const levels: Token[][] = [];
  for (const t of [...all].filter((t) => t.size >= 0.8 * maxSize).sort((a, b) => b.y - a.y)) {
    const level = levels.at(-1);
    if (level && Math.abs(level[0].y - t.y) <= LEVEL_TOL) level.push(t);
    else levels.push([t]);
  }
  // Two rows of real text (more than a fraction part each) are not a formula.
  if (levels.filter((l) => visible(l.map((t) => t.text).join('')) > MAX_PART).length >= 2) return null;
  const runsByLevel = levels.map(runsOf);
  // Subscripts / superscripts belong to the run they follow (v1 over v2 is "v1/v2").
  for (const t of all.filter((t) => t.size < 0.8 * maxSize)) {
    const run = runsByLevel.flat().find((r) => Math.abs(r.y - t.y) <= 0.5 * r.size && t.x0 >= r.x0 && t.x0 <= r.x1 + 0.6 * r.size);
    if (!run) continue;
    run.ts.push(t);
    run.ts.sort(byX);
    run.x1 = Math.max(run.x1, t.x1);
  }
  const used = new Set<Token>();
  const fractions: { text: string; x0: number; x1: number; size: number; members: Token[] }[] = [];

  for (let u = 0; u < levels.length; u++) {
    for (let l = u + 1; l < levels.length; l++) {
      const dy = levels[u][0].y - levels[l][0].y;
      const size = Math.max(levels[u][0].size, levels[l][0].size);
      if (dy < FRACTION_DY[0] * size || dy > FRACTION_DY[1] * size) continue;
      for (const top of runsByLevel[u]) {
        if (top.ts.some((t) => used.has(t)) || visible(joinTokens(top.ts)) > MAX_PART) continue;
        let best: Run | null = null;
        let bestOverlap = 0;
        for (const bottom of runsByLevel[l]) {
          if (bottom.ts.some((t) => used.has(t)) || visible(joinTokens(bottom.ts)) > MAX_PART) continue;
          const overlap = Math.min(top.x1, bottom.x1) - Math.max(top.x0, bottom.x0);
          if (overlap > bestOverlap) [best, bestOverlap] = [bottom, overlap];
        }
        if (!best) continue;
        const x0 = Math.min(top.x0, best.x0);
        const x1 = Math.max(top.x1, best.x1);
        // A fraction bar has text beside it on the main line, never above/below it in the
        // gap (that would be a table column of numbers, not a fraction). The parts' own
        // subscripts (v1 over v2) do sit in the gap and do not count.
        const own = new Set([...top.ts, ...best.ts]);
        const between = all.filter((t) => !own.has(t) && t.y < levels[u][0].y - LEVEL_TOL && t.y > levels[l][0].y + LEVEL_TOL);
        if (!between.length || between.some((t) => t.x1 > x0 && t.x0 < x1)) continue;
        let text = `${part(top, spaces, maxSize)}/${part(best, spaces, maxSize)}`;
        if (text === '1/2') text = '½';
        for (const t of [...top.ts, ...best.ts]) used.add(t);
        fractions.push({ text, x0, x1, size, members: [...top.ts, ...best.ts] });
      }
    }
  }

  const rest = all.filter((t) => !used.has(t));
  // What is left must be ONE row (plus sub/superscripts); otherwise this is two rows of text
  // side by side (a "Do You Know?" box title, a caption) and must not be interleaved.
  const rowYs = rest.filter((t) => t.size >= 0.8 * maxSize).map((t) => t.y);
  if (rowYs.length && Math.max(...rowYs) - Math.min(...rowYs) > 0.5 * maxSize) return null;
  const merged: Token[] = [
    ...rest,
    ...fractions.map((f, i) => ({ text: f.text, x0: f.x0, x1: f.x1, y: f.members[0].y, size: f.size, item: -1 - i, word: 0 })),
  ].sort(byX);
  return joinTokens(merged, spaces, maxSize);
}

/**
 * Lines of one page with formula groups rebuilt. A group is emitted where its first line was;
 * items far from the group's baselines (e.g. the "Reprint 2026-27" footer that pdf.js glues to
 * the last line) are appended after the rebuilt text so footer handling still sees them.
 */
export function rebuildFormulaLines(lines: readonly (ItemLine & { text: string; y: number | null })[]): { lines: RebuiltLine[]; rebuilt: { before: string; after: string }[] } {
  const groups = linkFormulaLines(lines);
  const groupOf = new Map<number, number[]>();
  for (const g of groups) for (const i of g) groupOf.set(i, g);
  const out: RebuiltLine[] = [];
  const rebuilt: { before: string; after: string }[] = [];
  lines.forEach((line, i) => {
    const g = groupOf.get(i);
    if (!g) return void out.push({ text: line.text, y: line.y });
    if (g[0] !== i) return; // emitted with the group's first line
    const infos = g.map((k) => lineInfo(lines[k])).filter((x): x is NonNullable<typeof x> => x !== null);
    const lo = Math.min(...infos.map((x) => x.base - 1.5 * x.size));
    const hi = Math.max(...infos.map((x) => x.base + 1.5 * x.size));
    const items = g.flatMap((k) => lines[k].items);
    // The page footer ("Reprint 2026-27") is glued to the last stream line; keep it out.
    const keep = (it: TextItem) => it.y >= lo && it.y <= hi && !FOOTER.test(it.str);
    const formula = rebuildFormulaText(items.filter(keep));
    if (formula === null) {
      for (const k of g) out.push({ text: lines[k].text, y: lines[k].y }); // ordinary text: unchanged
      return;
    }
    const text = formula + items.filter((it) => !keep(it)).map((it) => it.str).join('');
    const main = infos.reduce((a, b) => (b.visible > a.visible ? b : a));
    out.push({ text, y: main.base });
    rebuilt.push({ before: g.map((k) => lines[k].text).join(' ⏎ '), after: text });
  });
  return { lines: out, rebuilt };
}
