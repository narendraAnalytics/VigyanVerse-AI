// Agent 12: Diagram (code only, no model call; owner 2026-11-16).
//
// When a student asks to draw a diagram, the text answer comes from the tutor / maths agent as
// usual, and this adds ONE of:
//   ray    - mirror / lens ray diagram: code reads the mirror or lens, focal length and object
//            distance (or a textbook position like "between F and C") from the question, solves
//            the image with src/verify/optics.ts, and the app draws it exactly. Never a picture
//            from a model (they get rays and labels wrong).
//   ask    - a mirror / lens diagram, but the object position is missing: the app asks for it.
//   figure - any other diagram (heart, nephron, neuron...): points to the NCERT figure that shows
//            it, read from the retrieved textbook chunks ("Figure 5.10 Schematic sectional view
//            of the human heart"), with its chapter and page. Never invented: no matching
//            caption in the retrieved chunks means no pointer.
import type { ChunkHit } from '../shared/retrieval.ts';
import { distanceFor, solveOptics, type ObjectPosition, type OpticalElement, type OpticalType, type OpticsResult } from '../verify/optics.ts';

export interface RayDiagram extends OpticsResult {
  kind: 'ray';
  /** True when the question gave no numbers: the distances are a representative drawing. */
  assumed: boolean;
}
export interface AskForPosition { kind: 'ask'; element: OpticalElement; type: OpticalType }
export interface FigurePointer {
  kind: 'figure';
  /** "5.10" */
  figure: string;
  caption: string | null;
  chapterNumber: number | null;
  chapterTitle: string;
  pageStart: number;
  pageEnd: number;
}
export type Diagram = RayDiagram | AskForPosition | FigurePointer;

/** Does the student ask for a drawing? ("Draw a ray diagram", "with a labelled diagram"...) */
export function wantsDiagram(text: string): boolean {
  return /\b(draw|drawing|diagram|diagrams|sketch)\b/i.test(text);
}

export interface RayQuestion {
  element: OpticalElement;
  type: OpticalType;
  focalLength?: number;
  objectDistance?: number;
  position?: ObjectPosition;
}

const NUM = String.raw`(\d+(?:\.\d+)?)\s*(cm|m)\b`;
const toCm = (n: string, unit: string) => Number(n) * (unit.toLowerCase() === 'm' ? 100 : 1);

/** Read a mirror / lens question. Null when it is not about a spherical mirror or a lens. */
export function parseRayQuestion(text: string): RayQuestion | null {
  const t = text.replace(/[−–]/g, '-');
  const el = t.match(/\b(concave|convex|converging|diverging)\s+(mirror|lens)\b/i);
  if (!el) return null;
  const element = el[2].toLowerCase() as OpticalElement;
  const word = el[1].toLowerCase();
  const type: OpticalType = word === 'concave' || word === 'convex'
    ? word
    // converging = concave mirror / convex lens; diverging = convex mirror / concave lens
    : (word === 'converging') === (element === 'mirror') ? 'concave' : 'convex';
  const q: RayQuestion = { element, type };

  let m = t.match(new RegExp(String.raw`focal\s+length\s*(?:\(f\)\s*)?(?:of|is|=|:)?\s*(?:about\s+)?[-+]?\s*${NUM}`, 'i'))
    ?? t.match(new RegExp(String.raw`\bf\s*=\s*[-+]?\s*${NUM}`, 'i'));
  if (m) q.focalLength = toCm(m[1], m[2]);
  else {
    m = t.match(new RegExp(String.raw`radius\s+of\s+curvature\s*(?:of|is|=|:)?\s*[-+]?\s*${NUM}`, 'i'))
      ?? t.match(new RegExp(String.raw`\bR\s*=\s*[-+]?\s*${NUM}`));
    if (m) q.focalLength = toCm(m[1], m[2]) / 2;
  }

  m = t.match(new RegExp(String.raw`\bu\s*=\s*[-+]?\s*${NUM}`, 'i'))
    ?? t.match(new RegExp(String.raw`distance\s+of\s+the\s+object\s+(?:from\s+the\s+(?:mirror|lens|pole|optical\s+centre)\s+)?(?:is|=|:)\s*[-+]?\s*${NUM}`, 'i'))
    ?? t.match(new RegExp(String.raw`\b(?:object|candle|needle|pin|bulb|arrow)\b[^.?!]{0,80}?\b(?:at\s+a\s+distance\s+of|distance\s+of|at)\s+[-+]?\s*${NUM}(?!\s*(?:tall|high|long|in\s+(?:size|height)))`, 'i'))
    ?? t.match(new RegExp(String.raw`\bobject\b[^.?!]{0,80}?\b${NUM}\s+(?:in\s+front\s+of|away\s+from|from)\s+(?:the\s+|a\s+|an\s+)?(?:(?:concave|convex|converging|diverging|spherical)\s+)?(?:mirror|lens|pole|optical\s+centre)`, 'i'));
  if (m) q.objectDistance = toCm(m[1], m[2]);

  if (q.objectDistance === undefined) q.position = positionFromWords(t);
  return q;
}

const F = String.raw`(?:the\s+)?(?:principal\s+)?(?:f\s*[12]?|focus)\b`;
const C = String.raw`(?:the\s+)?(?:c\b|centre\s+of\s+curvature|center\s+of\s+curvature|2\s*f\s*[12]?\b)`;
const P = String.raw`(?:the\s+)?(?:p\b|pole|o\b|optical\s+cent(?:re|er))`;

function positionFromWords(t: string): ObjectPosition | undefined {
  const has = (re: string) => new RegExp(re, 'i').test(t);
  if (has(String.raw`between\s+${F}\s+and\s+${C}`) || has(String.raw`between\s+${C}\s+and\s+${F}`)) return 'between_f_2f';
  if (has(String.raw`between\s+${P}\s+and\s+${F}`) || has(String.raw`between\s+${F}\s+and\s+${P}`)) return 'inside_f';
  if (has(String.raw`beyond\s+${C}`)) return 'beyond_2f';
  if (has(String.raw`\bat\s+${C}`)) return 'at_2f';
  if (has(String.raw`\bat\s+${F}`)) return 'at_f';
  if (has(String.raw`\b(?:at|from)\s+infinity\b|very\s+far|far\s+away|distant\s+object`)) return 'infinity';
  if (has(String.raw`(?:less\s+than|within)\s+(?:the\s+|its\s+)?focal\s+length|very\s+close\s+to\s+the\s+(?:mirror|lens)`)) return 'inside_f';
  return undefined;
}

/** The ray diagram for a parsed question, or "ask" when the object's position is missing. */
export function rayDiagram(q: RayQuestion): RayDiagram | AskForPosition {
  const converging = (q.element === 'mirror') === (q.type === 'concave');
  const position = q.position ?? (converging ? undefined : 'finite');
  const hasNumbers = q.objectDistance !== undefined && q.focalLength !== undefined;
  if (!hasNumbers && !position) return { kind: 'ask', element: q.element, type: q.type };
  const okRange = (x: number | undefined, max: number) => x === undefined || (x > 0 && x <= max);
  if (!okRange(q.focalLength, 1000) || !okRange(q.objectDistance, 10000)) return { kind: 'ask', element: q.element, type: q.type };

  // A distance without a focal length (or the reverse) cannot place the image: draw the
  // textbook position with a representative focal length instead.
  const f = hasNumbers ? q.focalLength! : q.focalLength ?? 10;
  const u = hasNumbers ? q.objectDistance! : position ? distanceFor(position, f) : undefined;
  if (u === undefined) return { kind: 'ask', element: q.element, type: q.type };
  return { kind: 'ray', ...solveOptics({ element: q.element, type: q.type, focalLength: f, objectDistance: u }), assumed: !hasNumbers };
}

const STOP = new Set(['the', 'and', 'for', 'its', 'how', 'are', 'can', 'you', 'draw', 'drawing', 'diagram', 'diagrams', 'labelled', 'labeled', 'label', 'neat', 'show', 'with', 'help', 'explain', 'describe', 'what', 'which', 'that', 'this', 'their', 'there', 'from', 'into', 'about', 'parts', 'part', 'figure', 'give', 'make', 'well', 'also', 'name', 'sketch', 'class', 'question', 'answer', 'solve', 'step', 'schematic', 'sectional', 'view', 'representation']);

/** Meaningful words, cut to 5 letters so "kidneys" matches "kidney". */
function stems(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((w) => !STOP.has(w)).map((w) => w.slice(0, 5)));
}

/** What is to be drawn: "diagram of the human heart and explain..." -> "human heart". */
export function drawingSubject(question: string): string {
  const m = question.match(/\b(?:diagram|sketch|figure|structure)\s+(?:to\s+show\s+|showing\s+)?(?:of\s+)?(?:the\s+|a\s+|an\s+)?([^.?!,;:\n]+)/i)
    ?? question.match(/\bdraw\s+(?:a\s+|an\s+|the\s+)?(?:neat\s+)?(?:(?:and\s+)?labell?ed\s+)?([^.?!,;:\n]+)/i);
  return (m?.[1] ?? question).split(/\b(?:and|to|which|that|with|in|showing)\b/i)[0].trim() || question;
}

/**
 * The caption text after "Figure 5.10": chunk text runs straight on into the page's prose, so
 * stop at the next figure / table / activity, a sentence end, or a word with a digit (page
 * numbers, formulas), at most 12 words.
 */
function rawCaption(after: string): string {
  const head = after.split(/\b(?:Fig(?:ure)?\.?\s*\d|Table\s+\d|Activity\s+\d)/)[0].split(/[.?!]\s/)[0];
  const words: string[] = [];
  for (const w of head.split(/\s+/).filter(Boolean)) {
    if (/\d/.test(w) || words.length >= 12) break;
    words.push(w);
  }
  return words.join(' ');
}

/** Shorten a caption to where every matched word has appeared ("Human alimentary canal have often..."). */
function shownCaption(caption: string, matched: Set<string>): string {
  const words = caption.split(' ');
  const seen = new Set<string>();
  let end = words.length;
  for (let i = 0; i < words.length; i++) {
    for (const s of stems(words[i])) if (matched.has(s)) seen.add(s);
    if (seen.size === matched.size) { end = i + 1; break; }
  }
  // Finish the name ("...stomatal pore"), but stop where the page's prose starts.
  const PROSE = /^(?:have|has|is|are|was|were|all|like|do|does|you|we|how|what|when|it|its|they|can|let|now|this|these|there|the|a|an|and|of|in|to|as|by|on)$/i;
  for (let k = 0; k < 2 && end < words.length; k++) {
    const w = words[end];
    if (/[,;:]$/.test(words[end - 1]) || /^[A-Z(]/.test(w) || PROSE.test(w) || /(?:ing|ed)$/i.test(w)) break;
    end++;
  }
  return words.slice(0, end).join(' ').replace(/^\([a-z]\)\s*/i, '').replace(/[\s,;:(]+$/, '');
}

/**
 * The NCERT figure (in the retrieved chunks) whose caption names what is to be drawn. Most of
 * its words must be in the caption: "human eye" must not point to the human HEART figure.
 */
export function findFigure(question: string, hits: readonly ChunkHit[]): FigurePointer | null {
  const want = stems(drawingSubject(question));
  if (!want.size) return null;
  let best: { score: number; pointer: FigurePointer } | null = null;
  for (const h of hits.slice(0, 5)) {
    const re = /Figure\s+(\d{1,2}\.\d{1,2})\s+([^\n]{3,160})/g;
    for (let m = re.exec(h.content); m; m = re.exec(h.content)) {
      // "Figure 11.1 shows the..." is the text referring to a figure, not its caption.
      if (/^[a-z]/.test(m[2])) continue;
      const caption = rawCaption(m[2]);
      const have = stems(caption);
      const matched = new Set([...have].filter((w) => want.has(w)));
      // Most of what is asked for is in the caption, or the whole (short) caption is asked for
      // ("electrolysis of water" in "set-up for electrolysis of water").
      const whole = have.size >= 2 && matched.size === have.size;
      if (!(matched.size * 2 > want.size || whole)) continue;
      const score = matched.size + (whole ? 0.5 : 0);
      if (!best || score > best.score) {
        best = {
          score,
          pointer: {
            kind: 'figure', figure: m[1], caption: shownCaption(caption, matched) || null, chapterNumber: h.chapter_number,
            chapterTitle: h.chapter_title_en, pageStart: h.page_start, pageEnd: h.page_end,
          },
        };
      }
    }
  }
  return best?.pointer ?? null;
}

/**
 * The diagram for a turn, or null. `previous` is the student's last question, for follow-ups
 * like "draw its ray diagram". `hits` are the textbook chunks this turn retrieved.
 */
export function buildDiagram(input: { message: string; previous?: string; hits: readonly ChunkHit[] }): Diagram | null {
  if (!wantsDiagram(input.message)) return null;
  const q = parseRayQuestion(input.message) ?? (input.previous ? parseRayQuestion(`${input.previous}\n${input.message}`) : null);
  if (q) return rayDiagram(q);
  return findFigure(input.message, input.hits);
}
