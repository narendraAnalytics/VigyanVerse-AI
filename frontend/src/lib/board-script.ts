// "Bindu explains": turns a tutor answer into whiteboard segments and a timeline that follows the voice.
// Pure functions (no DOM), so the timing rules can be checked on their own.
//
// The voice reads `spokenText` (voice-speak's cleaned answer: no markdown, single spaces, at most 600
// characters). The board shows the answer's own lines (working steps stay on separate lines), cleaned the
// same way. Each line is written while the voice reads it: its time slice is its share of the spoken
// characters. Lines past the 600-character cap are written quickly after the voice ends.

export type InkTone = 'ink' | 'blue' | 'red' | 'green';

export interface BoardSegment {
  text: string;
  tone: InkTone;
  /** Writing window, seconds on the lesson clock. */
  start: number;
  end: number;
}

export interface LessonPlan {
  segments: BoardSegment[];
  /** The heading is written while Bindu says the welcome (or, with no welcome, before the voice). */
  titleEnd: number;
  /** When the voice starts / ends on the lesson clock. */
  voiceStart: number;
  voiceEnd: number;
  /** Citation + check mark after the last line; the lesson ends at `end`. */
  citeStart: number;
  end: number;
}

/** With no welcome: title time before the voice starts (title letters, then the double underline). */
export const INTRO = 1.1;
const AFTER_LINE = 0.7;
const CITE = 0.9;
const HOLD = 1.2;

/** The same cleaning as voice-speak's speakableText, for one line (so positions line up). */
export function cleanLine(line: string): string {
  return line
    .replace(/[`*_#>]+/g, '')
    .replace(/\[\s*\d+(?:\s*,\s*\d+)*\s*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Marker colour for a line: blue for working, green for the conclusion. */
export function toneOf(text: string): InkTone {
  if (/^(so|therefore|hence|answer)\b/i.test(text)) return 'green';
  if (text.length <= 70 && /=/.test(text) && /[0-9a-z]\s*=|=\s*[-0-9a-z(]/i.test(text)) return 'blue';
  return 'ink';
}

/** Board lines of an answer: one per non-empty line, list markers become a bullet. */
export function boardLines(answer: string): { text: string; tone: InkTone }[] {
  return answer
    .split(/\n+/)
    .map((raw) => {
      const bullet = /^\s*[-*•]\s+/.test(raw);
      const text = cleanLine(raw.replace(/^\s*[-*•]\s+/, ''));
      return text ? { text: bullet ? `• ${text}` : text, tone: toneOf(text) } : null;
    })
    .filter((x): x is { text: string; tone: InkTone } => x !== null)
    .filter((l) => !/^\|?[\s:-]+\|[\s|:-]*$/.test(l.text)); // markdown table rules
}

/**
 * Timeline for a lesson. `voiceSeconds` is the audio length. Each line's window is its share of the
 * spoken characters; a little of each window is left at the end so the next line starts on a fresh breath.
 * `greeting` is Bindu's welcome, spoken first (the spoken text starts with it): the heading is written
 * during it and the voice starts at once.
 */
export function planLesson(answer: string, spokenText: string, voiceSeconds: number, greeting = ''): LessonPlan {
  const lines = boardLines(answer);
  const spoken = Math.max(1, spokenText.length);
  const voice = Math.max(0.5, voiceSeconds);
  const greet = cleanLine(greeting);
  const greetChars = greet && spokenText.startsWith(greet) ? greet.length + 1 : 0;
  const voiceStart = greetChars ? 0 : INTRO;
  const voiceEnd = voiceStart + voice;
  const titleEnd = greetChars ? Math.max(0.9, (greetChars / spoken) * voice) : INTRO;
  const segments: BoardSegment[] = [];
  let pos = greetChars;
  let after = voiceEnd;
  for (const l of lines) {
    const plain = l.text.replace(/^• /, '');
    const from = pos;
    const to = pos + plain.length;
    pos = to + 1; // the space joining lines in the spoken text
    if (from < spoken) {
      const a = voiceStart + (from / spoken) * voice;
      const b = voiceStart + (Math.min(to, spoken) / spoken) * voice;
      segments.push({ ...l, start: a, end: Math.max(a + 0.25, a + (b - a) * 0.92) });
    } else {
      segments.push({ ...l, start: after, end: after + AFTER_LINE * 0.85 });
      after += AFTER_LINE;
    }
  }
  const citeStart = Math.max(voiceEnd, after) + 0.15;
  return { segments, titleEnd, voiceStart, voiceEnd, citeStart, end: citeStart + CITE + HOLD };
}

const shorten = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 2).replace(/\s+\S*$/, '')}…`);

/**
 * NCERT end-of-chapter / box sections that are not a topic ("What you have learnt" is the chapter summary,
 * "Exercises" the questions): the board heading falls back to the chapter title for these.
 */
const NOT_A_TOPIC = /^(what you have learnt|exercises?|questions?|activity|do you know\??|more to know!?|think it over|example)$/i;

/** Topic name from a section path ("Light > 9.2.3 Mirror Formula and Magnification" -> "Mirror Formula and Magnification"). */
export function topicName(section: string | null | undefined): string {
  const lastPart = (section ?? '').split(/\s*[>/|»]\s*/).filter(Boolean).pop() ?? '';
  const name = cleanLine(lastPart.replace(/^(chapter|activity|example)?\s*[\d.]+\s*[:.)-]?\s*/i, ''));
  return NOT_A_TOPIC.test(name) ? '' : name;
}

/** Words too general to tell two sections apart ("Displacement Reaction" vs "Decomposition Reaction"). */
const GENERAL_WORDS = new Set([
  'reaction', 'reactions', 'chemical', 'properties', 'property', 'types', 'type', 'nature', 'what', 'does',
  'happens', 'when', 'their', 'with', 'from', 'into', 'some', 'more', 'about', 'using', 'used', 'other',
  'effect', 'effects', 'important', 'common', 'understanding', 'everyday', 'life', 'human', 'beings',
]);

/**
 * True when the section name fits the answer: at least one of its specific words (first 4 letters,
 * so "Metallic" fits "metal", "Acids" fits "acidic") is in the answer. A textbook passage can span two sections and carry
 * the later one's name (2026-11-24: the "black and white photography" text of 1.2.2 Decomposition
 * is stored under "1.2.3 Displacement Reaction"); then the chapter title is the safer heading.
 */
export function topicFitsAnswer(topic: string, answer: string): boolean {
  const stems = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4).map((w) => w.slice(0, 4));
  const specific = topic.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4 && !GENERAL_WORDS.has(w)).map((w) => w.slice(0, 4));
  if (!specific.length || !answer.trim()) return true; // nothing to check against
  const inAnswer = new Set(stems(answer));
  return specific.some((w) => inAnswer.has(w));
}

/**
 * Board heading: the topic of the textbook section the answer came from (when it fits the answer),
 * else the chapter title, else the student's question (shortened), else a friendly default.
 */
export function lessonTitle(topic: { section?: string | null; chapterTitle?: string | null } | null, question?: string, answer?: string): string {
  const section = topicName(topic?.section);
  const fromBook = (section && topicFitsAnswer(section, answer ?? '') ? section : '') || cleanLine(topic?.chapterTitle ?? '') || section;
  if (fromBook) return shorten(fromBook, 40);
  const q = cleanLine(question ?? '').replace(/[?.!]+$/, '');
  return q ? shorten(q, 34) : "Let's see!";
}

const WELCOMED_KEY = 'vv-bindu-welcomed';

/**
 * Bindu's welcome, spoken while the heading is written. The very first lesson on this device gets the
 * full welcome (name + app); later ones a short hello. English only for now (owner 2026-11-16).
 */
export function lessonGreeting(title: string, fromBook: boolean): string {
  let first = true;
  try { first = window.localStorage.getItem(WELCOMED_KEY) !== '1'; } catch { /* storage blocked: treat as first */ }
  const about = fromBook ? `Let's learn about ${title.replace(/…$/, '')}` : "Let's look at your question";
  return first
    ? `Hi! I'm Bindu, your science friend here at VigyanVerse AI. Welcome! ${about} together.`
    : `Hi, it's Bindu! ${about}.`;
}

/** Remember that this device has heard the full welcome. */
export function markWelcomed() {
  try { window.localStorage.setItem(WELCOMED_KEY, '1'); } catch { /* storage blocked */ }
}
