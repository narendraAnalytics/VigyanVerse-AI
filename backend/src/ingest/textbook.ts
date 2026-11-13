// Pure text processing for NCERT-style chapter PDFs (one PDF = one chapter).
// Input: per-PDF-page text from unpdf. Output: section-aware chunks with PRINTED page
// numbers. Page numbers are derived from the running headers ("Science80",
// "Life Processes 99") and refused when the headers do not agree: we never guess.

export interface Chunk {
  chunkIndex: number;
  pageStart: number;
  pageEnd: number;
  sectionPath: string | null;
  content: string;
}

const REPRINT_MARK = /Reprint\s+\d{4}-\d{2}/g;

/**
 * NCERT headings are drawn several times on top of each other ("shadow" text), so the
 * text layer repeats each run 5x: "5.3 RESPIR5.3 RESPIR...AAAAATIONTION...". Collapse any
 * unit repeated 5+ times in a row if it has a letter or is 3+ characters long
 * ("1 . 31 . 3..."), so plain numbers like "100000" are kept.
 */
export function collapseShadowText(line: string): string {
  return line.replace(/(.+?)\1{4,}/g, (match, unit: string) => (/[A-Za-z]/.test(unit) || unit.length >= 3 ? unit : match));
}

/**
 * "?11.3 CIRCUIT" -> "11.3 CIRCUIT"; "1 . 3 HAVE" -> "1.3 HAVE"; "1 2 . 2 MAGNETIC" -> "12.2 MAGNETIC"
 * (icon glyphs, letter-spaced numbers).
 */
export function normalizeHeadingNumber(line: string): string {
  return line
    .replace(/^[?\s]+(?=\d)/, '')
    .replace(/^(\d(?: ?\d)?) ?\. ?(\d{1,2})(?: ?\. ?(\d{1,2}))?(?=\s)/, (_, a: string, b: string, c?: string) =>
      [a.replace(' ', ''), b, c].filter(Boolean).join('.'));
}

/** Lower-case words (letters, hyphens, apostrophes) used in body text, for heading repair. */
export function buildVocabulary(lines: Iterable<string>): Set<string> {
  const vocab = new Set<string>();
  for (const line of lines) for (const w of line.toLowerCase().match(/[a-z][a-z'’-]*[a-z]/g) ?? []) vocab.add(w);
  return vocab;
}

/**
 * Repair ALL-CAPS headings that the PDF letter-spaces ("COORDINATION IN PL ANTS",
 * "CURRENT-C ARRYING", "ACCUMUL ATION"): join two tokens when the first is not a body-text
 * word and either the join is one, or the second is a non-word starting with "A".
 * Also collapses shadow-repeated dashes ("CURRENT-----CARRYING", "Traits –––––").
 */
export function repairHeadingTitle(title: string, vocab: ReadonlySet<string>): string {
  const t = title.replace(/([-–—])\1{2,}/g, '$1');
  if (t !== t.toUpperCase()) return t;
  const key = (w: string) => w.toLowerCase().replace(/[^a-z'’-]/g, '');
  const tokens = t.split(' ');
  for (let i = 0; i < tokens.length - 1; i++) {
    const [a, b] = [key(tokens[i]), key(tokens[i + 1])];
    const isWord = (w: string) => vocab.has(w) || SMALL_WORDS.has(w);
    // The PDF's kerning gap comes before an "A" ("PL ANTS", "ACCUMUL ATION").
    if (a && b && !isWord(a) && (vocab.has(key(tokens[i] + tokens[i + 1])) || (b.startsWith('a') && !isWord(b)))) {
      tokens.splice(i, 2, tokens[i] + tokens[i + 1]);
      i--;
    }
  }
  return tokens.join(' ');
}

/** One text line of a PDF page with the baseline y of its first glyph (PDF units, y grows upward). */
export interface PageLine { text: string; y: number | null }

/**
 * Some NCERT pages draw a section heading LAST in the text stream, glued to the footer
 * ("1.2.2 Decomposition ReactionReprint 2026-27"), after the text it introduces. Move such a
 * heading to just above the line printed directly below it (highest y under the heading's y).
 * Returns plain page strings for chunkTextbook().
 */
export function relocateFooterHeadings(pages: readonly PageLine[][], chapterNumber: number, warn: (msg: string) => void = () => {}): string[] {
  const glued = new RegExp(`^[?\\s]*${chapterNumber}\\s?\\.\\s?\\d{1,2}(?:\\s?\\.\\s?\\d{1,2})?\\s+\\S.*?Reprint\\s+\\d{4}-\\d{2}\\s*$`);
  return pages.map((lines, p) => {
    const out = [...lines];
    for (let i = out.length - 1; i > 0; i--) {
      const line = out[i];
      if (line.y === null || !glued.test(collapseShadowText(line.text.trim()))) continue;
      let target = -1;
      for (let k = 1; k < i; k++) { // k = 0 is the running header
        const y = out[k].y;
        if (y !== null && y < line.y - 1 && (target < 0 || y > (out[target].y as number))) target = k;
      }
      if (target < 0) continue;
      out.splice(i, 1);
      out.splice(target, 0, { text: line.text.replace(REPRINT_MARK, ''), y: line.y });
      warn(`PDF page ${p + 1}: moved footer-glued heading "${line.text.replace(REPRINT_MARK, '').trim()}" above "${out[target + 1].text.trim().slice(0, 40)}"`);
    }
    return out.map((l) => l.text).join('\n');
  });
}

/** Compare section numbers like "2.1.4" and "2.1.5" in reading order. */
export function compareSectionNumbers(a: string, b: string): number {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

/** Printed page number in a page's running header, or null. Handles "Science194194194". */
export function parseHeaderPageNumber(firstLine: string): number | null {
  const m = firstLine.match(/^[A-Z][A-Za-z ,'’–-]{2,60}?\s*(\d{1,3})(?:\1)*\s*$/);
  return m ? Number(m[1]) : null;
}

/**
 * Offset such that printed page = pdfPageNumber (1-based) + offset. Majority vote over
 * all pages with a header; throws unless >= 3 votes and >= 70% agreement.
 */
export function detectPageOffset(pages: readonly string[]): number {
  const votes = new Map<number, number>();
  let withHeader = 0;
  pages.forEach((text, i) => {
    const n = parseHeaderPageNumber((text.split('\n')[0] ?? '').trim());
    if (n === null) return;
    withHeader++;
    votes.set(n - (i + 1), (votes.get(n - (i + 1)) ?? 0) + 1);
  });
  const [offset, count] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0] ?? [0, 0];
  if (count < 3 || count / withHeader < 0.7) {
    throw new Error(`Cannot determine printed page numbers (best offset ${offset}: ${count}/${withHeader} pages agree)`);
  }
  return offset;
}

const SPACED_LABELS: Record<string, string> = {
  'Q U E S T I O N S': 'Questions',
  'E X E R C I S E S': 'Exercises',
};

const SMALL_WORDS = new Set(['a', 'an', 'and', 'the', 'of', 'in', 'on', 'to', 'for', 'with', 'its', 'or', 'by', 'at']);

export function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s; // already mixed case
  return s.toLowerCase().split(' ').map((w, i) =>
    i > 0 && SMALL_WORDS.has(w) ? w : w.replace(/^([(“"]?)([a-z])/, (_, p: string, c: string) => p + c.toUpperCase()),
  ).join(' ');
}

type Item = { kind: 'heading'; path: 'section' | 'subsection' | 'end'; title: string; page: number } | { kind: 'line'; text: string; page: number };

const TRAILING_JOINERS = /\b(of|and|the|in|on|a|an|to|for|with|its)$/i;
// A short Title Case line ("Conductor", "Hydrogencarbonates React with Acids?"): the second line
// of a wrapped mixed-case heading. Body text has lower-case words or punctuation instead.
const TITLE_CONTINUATION = /^(?!(?:Activity|Figure|Table|Example|Fig|Do You Know|More to Know)\b)[A-Z][A-Za-z'’-]*\??(?: (?:[A-Z][A-Za-z'’-]*|of|and|the|in|on|a|an|to|for|with|its|or|by|at|from)\??)*$/;

/** Turn pages into a stream of heading markers and text lines with printed page numbers. */
export function toItems(pages: readonly string[], chapterNumber: number, offset: number, warn: (msg: string) => void = () => {}): Item[] {
  const items: Item[] = [];
  // Titles start upper-case, except "pH of Salts".
  const headingRe = new RegExp(`^(${chapterNumber}\\.\\d{1,2}(?:\\.\\d{1,2})?)\\s+((?:[A-Z]|pH\\b)[^=]{2,120})$`);
  const pageLines = pages.map((raw) => {
    const lines = raw.replace(REPRINT_MARK, '').split('\n').map((l) => normalizeHeadingNumber(collapseShadowText(l).trim()));
    if (lines.length && parseHeaderPageNumber(lines[0]) !== null) lines.shift(); // running header
    return lines;
  });
  const vocab = buildVocabulary(pageLines.flat().filter((l) => l !== l.toUpperCase()));
  let lastNumber: string | null = null;

  pageLines.forEach((lines, i) => {
    const page = i + 1 + offset;

    for (let j = 0; j < lines.length; j++) {
      let line = lines[j];
      if (!line) continue;
      const label = SPACED_LABELS[line.replace(/\s+/g, ' ')];
      if (label === 'Exercises' || /^What you have learnt$/i.test(line)) {
        items.push({ kind: 'heading', path: 'end', title: label ?? 'What you have learnt', page });
        continue;
      }
      if (label) {
        items.push({ kind: 'line', text: `${label}:`, page }); // in-text question box
        continue;
      }
      const m = line.match(headingRe);
      if (m && !/[.:;]$/.test(m[2])) {
        let title = repairHeadingTitle(m[2], vocab);
        // Headings that wrap: an ALL-CAPS continuation line, a title ending in "of"/"and" or a
        // dash, or a short Title Case continuation line.
        const next = lines[j + 1];
        const caps = title === title.toUpperCase();
        const endsWithDash = /[–—-]$/.test(title);
        if (next && next.length < 80 && (
          (caps && next === next.toUpperCase() && /[A-Z]/.test(next)) ||
          TRAILING_JOINERS.test(title) || endsWithDash ||
          (!caps && next.length <= 60 && TITLE_CONTINUATION.test(next))
        )) {
          title = repairHeadingTitle(endsWithDash ? `${title.replace(/\s*[–—-]$/, '')} – ${next}` : `${title} ${next}`, vocab);
          j++;
        }
        // Some PDFs draw a heading out of reading order (Ch 2: "2.1.4" comes after 2.1.5's
        // text). Attaching it would mislabel everything after it, so drop it.
        if (lastNumber && compareSectionNumbers(m[1], lastNumber) < 0) {
          warn(`p${page}: heading ${m[1]} appears after ${lastNumber}; ignored (out of reading order)`);
          continue;
        }
        lastNumber = m[1];
        const depth = m[1].split('.').length; // 2 = section, 3 = subsection
        items.push({ kind: 'heading', path: depth === 2 ? 'section' : 'subsection', title: `${m[1]} ${titleCase(title)}`, page });
        continue;
      }
      items.push({ kind: 'line', text: line.replace(/^n (?=[A-Z(“"0-9])/, '• '), page });
    }
  });
  return items;
}

interface Sentence { text: string; page: number; pageEnd: number; section: string | null }

function toSentences(items: readonly Item[]): Sentence[] {
  const out: Sentence[] = [];
  let section: string | null = null;
  let subsection: string | null = null;
  let buffer: { text: string; page: number }[] = [];

  const flush = () => {
    // Join wrapped lines into sentences. Every sentence completed while appending a line
    // ends on that line's page; only the first of them can have started earlier.
    let acc = '';
    let accStart = buffer[0]?.page ?? 0;
    let lastPage = accStart;
    const path = [section, subsection].filter(Boolean).join(' > ') || null;
    for (const { text, page } of buffer) {
      if (!acc) accStart = page;
      lastPage = page;
      acc = acc.endsWith('-') && /^[a-z]/.test(text) ? acc + text : acc ? `${acc} ${text}` : text;
      const parts = acc.split(/(?<=[.?!])\s+(?=[A-Z(•“"0-9])/);
      acc = parts.pop() ?? '';
      parts.forEach((p, k) => out.push({ text: p, page: k === 0 ? accStart : page, pageEnd: page, section: path }));
      if (parts.length) accStart = page;
    }
    if (acc.trim()) out.push({ text: acc, page: accStart, pageEnd: lastPage, section: path });
    buffer = [];
  };

  for (const item of items) {
    if (item.kind === 'line') {
      buffer.push(item);
      continue;
    }
    flush();
    if (item.path === 'section') {
      section = item.title;
      subsection = null;
    } else if (item.path === 'subsection') {
      subsection = item.title;
    } else {
      section = item.title;
      subsection = null;
    }
  }
  flush();
  return out;
}

export interface ChunkOptions { targetChars?: number; maxChars?: number; onWarning?: (msg: string) => void }

/** Group sentences into chunks that never cross a section boundary. */
export function chunkTextbook(pages: readonly string[], chapterNumber: number, opts: ChunkOptions = {}): Chunk[] {
  const target = opts.targetChars ?? 1600;
  const max = opts.maxChars ?? 2400;
  const offset = detectPageOffset(pages);
  const sentences = toSentences(toItems(pages, chapterNumber, offset, opts.onWarning));

  const chunks: Chunk[] = [];
  let current: Sentence[] = [];
  const emit = () => {
    const content = current.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
    if (content.length >= 40) {
      chunks.push({
        chunkIndex: chunks.length,
        pageStart: Math.min(...current.map((s) => s.page)),
        pageEnd: Math.max(...current.map((s) => s.pageEnd)),
        sectionPath: current[0].section,
        content: content.slice(0, 8000),
      });
    }
    current = [];
  };

  for (const s of sentences) {
    const size = current.reduce((n, c) => n + c.text.length + 1, 0);
    if (current.length && (s.section !== current[0].section || size >= target || size + s.text.length > max)) emit();
    current.push(s);
  }
  if (current.length) emit();
  return chunks;
}
