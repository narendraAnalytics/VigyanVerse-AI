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

/** "?11.3 CIRCUIT" -> "11.3 CIRCUIT"; "1 . 3 HAVE" -> "1.3 HAVE" (icon glyphs, letter-spaced numbers). */
export function normalizeHeadingNumber(line: string): string {
  return line
    .replace(/^[?\s]+(?=\d)/, '')
    .replace(/^(\d{1,2}) ?\. ?(\d{1,2})(?: ?\. ?(\d{1,2}))?(?=\s)/, (_, a: string, b: string, c?: string) => [a, b, c].filter(Boolean).join('.'));
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

/** Turn pages into a stream of heading markers and text lines with printed page numbers. */
export function toItems(pages: readonly string[], chapterNumber: number, offset: number): Item[] {
  const items: Item[] = [];
  const headingRe = new RegExp(`^(${chapterNumber}\\.\\d{1,2}(?:\\.\\d{1,2})?)\\s+([A-Z][^=]{2,120})$`);

  pages.forEach((raw, i) => {
    const page = i + 1 + offset;
    const lines = raw.replace(REPRINT_MARK, '').split('\n').map((l) => normalizeHeadingNumber(collapseShadowText(l).trim()));
    if (lines.length && parseHeaderPageNumber(lines[0]) !== null) lines.shift(); // running header

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
        let title = m[2];
        // Headings that wrap: an ALL-CAPS continuation line, or a title ending in "of"/"and".
        const next = lines[j + 1];
        if (next && next.length < 80 && ((title === title.toUpperCase() && next === next.toUpperCase() && /[A-Z]/.test(next)) || TRAILING_JOINERS.test(title))) {
          title = `${title} ${next}`;
          j++;
        }
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

export interface ChunkOptions { targetChars?: number; maxChars?: number }

/** Group sentences into chunks that never cross a section boundary. */
export function chunkTextbook(pages: readonly string[], chapterNumber: number, opts: ChunkOptions = {}): Chunk[] {
  const target = opts.targetChars ?? 1600;
  const max = opts.maxChars ?? 2400;
  const offset = detectPageOffset(pages);
  const sentences = toSentences(toItems(pages, chapterNumber, offset));

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
