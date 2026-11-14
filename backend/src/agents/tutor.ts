// Agent 3: AI Tutor (projectOverview.txt §7). Model: MODEL_ROUTES.tutor (Sarvam 105B).
//
// Input: the student's question + router output + the Curriculum Retrieval agent's passages
// and status. One JSON call returns {answer, inTextbook, sources, relatedPassage}; code then
// builds everything the student sees around the answer:
//   - citations: ONLY from the passages we gave (passage number -> chapter / section / page
//     from the database). Unknown numbers are dropped. The model never writes page numbers.
//   - NOT-IN-TEXTBOOK POLICY (owner, 2026-11-13): when the passages do not answer the
//     question, a 1-2 sentence general answer, labelled "Not from your Class 10 textbook -
//     not needed for the exam", no citations, plus a related textbook topic if one exists.
//   - fallback (model error / invalid JSON): quote the textbook's own words with a citation.
import { z } from 'zod';
import type { ChunkHit } from '../shared/retrieval.ts';
import { DATA_RULE, fence, runJsonAgent, STYLE_RULE, type AgentContext, type AgentRun, type JsonAgentSpec } from './kit.ts';
import type { ContextAssessment } from './retrieval.ts';

export type Language = 'en' | 'te' | 'te_latn';
export interface Turn { role: 'student' | 'tutor'; text: string }

export interface TutorInput {
  question: string;
  language: Language;
  wantsDetail: boolean;
  /** Up to 5 passages from the Curriculum Retrieval agent, best first. */
  passages: ChunkHit[];
  status: ContextAssessment['status'];
  /** Last turns of this conversation, oldest first (for follow-ups). */
  history?: Turn[];
}

export const ModelOutput = z.object({
  answer: z.string().min(1).max(4000),
  inTextbook: z.boolean(),
  sources: z.array(z.number().int()).max(5).default([]),
  relatedPassage: z.number().int().nullable().default(null),
});
export type ModelOutput = z.infer<typeof ModelOutput>;

export interface Citation {
  chunkId: string;
  chapterNumber: number | null;
  chapterTitle: string;
  section: string | null;
  pageStart: number;
  pageEnd: number;
}

export interface TutorOutput {
  answer: string;
  inTextbook: boolean;
  citations: Citation[];
  /** Shown above a general-knowledge answer; null when the answer is from the textbook. */
  label: string | null;
  /** "Related in your book" pointer for not-in-textbook answers. */
  related: Citation | null;
  /** How many source numbers the model gave that did not exist (logged, then dropped). */
  droppedSources: number;
}

export const NOT_IN_TEXTBOOK_LABEL: Record<Language, string> = {
  en: 'Not from your Class 10 textbook – not needed for the exam',
  te: 'ఇది మీ 10వ తరగతి పాఠ్యపుస్తకంలో లేదు – పరీక్షకు అవసరం లేదు',
  te_latn: 'Idi mee Class 10 textbook lo ledu – exam ki avasaram ledu',
};

export const LANGUAGE_RULE: Record<Language, string> = {
  en: 'Write the answer in simple English.',
  te: 'Write the answer in simple Telugu (Telugu script). Keep science terms and formulas in English in brackets where it helps, e.g. కిరణజన్య సంయోగక్రియ (photosynthesis).',
  te_latn: 'The student writes Telugu in English letters. Answer the same way: simple Telugu written in English letters, with science terms in English.',
};

export const MAX_TOKENS = { short: 600, detail: 1100 };
const PASSAGE_CHARS = 1500;

export function citationOf(h: ChunkHit): Citation {
  return {
    chunkId: h.chunk_id, chapterNumber: h.chapter_number, chapterTitle: h.chapter_title_en,
    section: h.section_path, pageStart: h.page_start, pageEnd: h.page_end,
  };
}

export function formatPassages(passages: readonly ChunkHit[]): string {
  if (!passages.length) return '(no passages found)';
  return passages.map((h, i) =>
    `[${i + 1}] Ch ${h.chapter_number ?? '?'} ${h.chapter_title_en} > ${h.section_path ?? 'introduction'} (p. ${h.page_start}${h.page_end !== h.page_start ? `-${h.page_end}` : ''})\n` +
    h.content.slice(0, PASSAGE_CHARS)).join('\n\n');
}

function buildSystem(input: TutorInput): string {
  return [
    'You are a friendly science tutor for a Class 10 student (CBSE / Andhra Pradesh, NCERT Science textbook).',
    input.wantsDetail
      ? 'The student asked for more detail: explain step by step in up to 8 short sentences or points, still in plain Class 10 language.'
      : STYLE_RULE,
    LANGUAGE_RULE[input.language],
    'You get numbered passages from the student\'s textbook.',
    'If the passages answer the question: answer ONLY from them, set "inTextbook": true and list the passage numbers you used in "sources". Copy formulas, signs and units exactly as the passages write them (e.g. m = -v/u, not v/u).',
    'If the passages do not answer it: still answer the question, in 1 or 2 simple sentences from general science knowledge, set "inTextbook": false and "sources": []. Never pretend it is in the textbook. Never invent page numbers or chapter names.',
    'Never talk about "the passages" in the answer (do not write "the passages do not contain..."): the student does not see them.',
    '"relatedPassage": the number of one passage on a closely related textbook topic the student could study next, or null if none is really related.',
    input.status === 'none' ? 'Note: the textbook search found no passage that matches this question well, so it is probably not in the textbook.' : '',
    input.history?.length ? 'The question may continue the earlier conversation (e.g. "give an example", "explain again"): answer it about that topic, and it counts as in the textbook if the passages cover that topic.' : '',
    'Do not write citations, passage numbers or page numbers inside "answer": the app shows them.',
    'Return only JSON: {"answer": "...", "inTextbook": true, "sources": [1], "relatedPassage": null}',
    DATA_RULE,
  ].filter(Boolean).join('\n');
}

function buildUser(input: TutorInput): string {
  const history = (input.history ?? []).slice(-4)
    .map((t) => `${t.role === 'student' ? 'Student' : 'Tutor'}: ${t.text.slice(0, 600)}`).join('\n');
  return [
    `Textbook passages:\n${formatPassages(input.passages)}`,
    history ? `Earlier in this conversation:\n${fence(history)}` : '',
    `Student question:\n${fence(input.question)}`,
  ].filter(Boolean).join('\n\n');
}

/**
 * For when the model is unavailable: the 2 sentences of the best passage that contain the
 * most matched query stems, in textbook order. Activity steps ("Activity 11.2", bullets)
 * and very short fragments are skipped: they are instructions, not explanations.
 */
export function extractiveAnswer(h: ChunkHit): string {
  const sentences = (h.content.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]/g) ?? [h.content]).map((s) => s.trim());
  const stems = h.matched_lexemes ?? [];
  const scored = sentences.map((s, i) => {
    const lower = s.toLowerCase();
    // Short fragments are skipped, but a short formula ("V = IR.") is exactly what we want.
    const instruction = /^(activity\b|•|figure\b|fig\.|table\b|q u e s t i o n)/i.test(s) || s.includes('•') || (s.length < 25 && !s.includes('='));
    return { s, i, score: instruction ? -1 : stems.filter((k) => lower.includes(k)).length };
  });
  const best = scored.filter((x) => x.score >= 0).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, 2).sort((a, b) => a.i - b.i);
  return (best.length ? best.map((x) => x.s) : sentences.slice(0, 2)).join(' ').slice(0, 400);
}

export const FALLBACK_TEXT: Record<Language, { quote: string; none: string }> = {
  en: { quote: 'Here is what your textbook says:', none: 'Sorry, I cannot answer right now. Please try again in a minute.' },
  te: { quote: 'మీ పాఠ్యపుస్తకం ఇలా చెబుతోంది:', none: 'క్షమించండి, ఇప్పుడు సమాధానం ఇవ్వలేకపోతున్నాను. ఒక నిమిషం తర్వాత మళ్లీ ప్రయత్నించండి.' },
  te_latn: { quote: 'Mee textbook ila chebutondi:', none: 'Sorry, ippudu answer ivvalekapotunnanu. Okka nimisham tarvata malli try cheyandi.' },
};

/** Deterministic post-processing: citations from our passages only, label, related topic. */
export function finalize(out: ModelOutput, input: Pick<TutorInput, 'passages' | 'language'>): TutorOutput {
  const valid = (n: number) => Number.isInteger(n) && n >= 1 && n <= input.passages.length;
  const sources = [...new Set(out.sources)];
  const kept = sources.filter(valid);
  // "In the textbook" needs at least one real passage behind it.
  const inTextbook = out.inTextbook && kept.length > 0;
  const related = !inTextbook && out.relatedPassage !== null && valid(out.relatedPassage)
    ? citationOf(input.passages[out.relatedPassage - 1]) : null;
  return {
    // Passage markers like "[1]" or "[1, 2]" are removed; the app shows citations itself.
    answer: out.answer.replace(/\s*\[\s*\d+(\s*,\s*\d+)*\s*\]/g, '').replace(/\s{2,}/g, ' ').trim(),
    inTextbook,
    citations: inTextbook ? kept.map((n) => citationOf(input.passages[n - 1])) : [],
    label: inTextbook ? null : NOT_IN_TEXTBOOK_LABEL[input.language],
    related,
    droppedSources: sources.length - kept.length,
  };
}

const tutorSpec: JsonAgentSpec<TutorInput, TutorOutput, ModelOutput> = {
  name: 'tutor',
  task: 'tutor',
  schema: ModelOutput,
  buildMessages: (input) => [
    { role: 'system', content: buildSystem(input) },
    { role: 'user', content: buildUser(input) },
  ],
  callOverrides: (input) => ({ maxTokens: input.wantsDetail ? MAX_TOKENS.detail : MAX_TOKENS.short }),
  postProcess: finalize,
  fallback: (input) => {
    const top = input.passages[0];
    const text = FALLBACK_TEXT[input.language];
    if (top && input.status !== 'none') {
      return { answer: `${text.quote} "${extractiveAnswer(top)}"`, inTextbook: true, citations: [citationOf(top)], label: null, related: null, droppedSources: 0 };
    }
    return { answer: text.none, inTextbook: false, citations: [], label: null, related: null, droppedSources: 0 };
  },
};

export function runTutor(input: TutorInput, ctx?: AgentContext): Promise<AgentRun<TutorOutput>> {
  return runJsonAgent(tutorSpec, input, ctx);
}

export { tutorSpec };
