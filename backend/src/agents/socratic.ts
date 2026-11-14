// Agent 4: Socratic Tutor (projectOverview.txt §7). Model: MODEL_ROUTES.socratic (Sarvam 105B).
//
// Teaches by guided questions instead of giving the answer at once. One JSON call per turn.
// CODE owns the plan for each turn; the model only writes the words:
//   open    first turn: one guiding question, no answer
//   respond later turns: confirm a correct reply (feedback), or give the next rung of the
//           hint ladder after "I don't know" / a wrong reply (hint)
//   reveal  the student asked for the answer ("just tell me", "answer cheppu"), or MAX_HINTS
//           hints were already given: give the full answer
// Socratic mode is only for textbook topics: when retrieval finds nothing (status 'none') the
// turn goes to the AI Tutor's labelled short answer instead (still one model call).
// Citations, the not-in-textbook label and the fallback reuse the tutor's deterministic code.
import { z } from 'zod';
import type { ChunkHit } from '../shared/retrieval.ts';
import { DATA_RULE, fence, runJsonAgent, type AgentContext, type AgentRun, type JsonAgentSpec } from './kit.ts';
import type { ContextAssessment } from './retrieval.ts';
import {
  citationOf, finalize, formatPassages, LANGUAGE_RULE, runTutor, tutorSpec,
  type Citation, type Language, type Turn,
} from './tutor.ts';

/** Hints before code reveals the answer (question -> hint -> stronger hint -> almost -> reveal). */
export const MAX_HINTS = 3;
export const SOCRATIC_MAX_TOKENS = 500;

export const KINDS = ['question', 'hint', 'feedback', 'reveal'] as const;
export type SocraticKind = (typeof KINDS)[number];
export type TurnPlan = 'open' | 'respond' | 'reveal';

export interface SocraticInput {
  /** The question that started this Socratic thread (retrieval searched for it). */
  topic: string;
  /** The student's latest message (the topic itself on the first turn). */
  message: string;
  language: Language;
  passages: ChunkHit[];
  status: ContextAssessment['status'];
  /** Turns of this thread before `message`, oldest first. Empty on the first turn. */
  history?: Turn[];
  /** Hints already given in this thread (code carries it from the previous output). */
  hintsGiven: number;
}

export interface SocraticOutput {
  reply: string;
  kind: SocraticKind;
  /** Did the student's latest reply get it right? null when there was nothing to judge. */
  studentCorrect: boolean | null;
  /** The thread is finished (answer confirmed or revealed); the next message starts fresh. */
  done: boolean;
  /** Updated hint count to carry into the next turn. */
  hintsGiven: number;
  plan: TurnPlan;
  /** INTERNAL, never send to the student: the model's own answer (for logs and evals). */
  hiddenAnswer: string;
  inTextbook: boolean;
  citations: Citation[];
  label: string | null;
  related: Citation | null;
  droppedSources: number;
}

// Field order matters: the model first writes the correct answer in "answer" (never shown to
// the student), then judges the student against it, and only then writes the reply. Eval run 2
// (2026-11-14): without a place to put the answer, Sarvam wrote it into 14% of the hints.
const ModelOutput = z.object({
  answer: z.string().max(1500).default(''),
  reply: z.string().min(1).max(3000),
  kind: z.preprocess((v) => (typeof v === 'string' ? v.trim().toLowerCase() : v), z.enum(KINDS)),
  studentCorrect: z.boolean().nullable().default(null),
  sources: z.array(z.number().int()).max(5).default([]),
  inTextbook: z.boolean().default(true),
});
type ModelOutput = z.infer<typeof ModelOutput>;

// "Tell me the answer" in the three ways students write. "Tell me about X" / "X gurinchi
// cheppandi" is a normal question, not a request to skip the thinking, so "answer" is needed.
const ASK_FOR_ANSWER = [
  /\b(just\s+)?(tell|give|show)\s+(me\s+)?(the\s+)?(full\s+|correct\s+|right\s+|final\s+)?answer\b/i,
  /\bjust\s+tell\s+me\b/i,
  /\bwhat('?s|\s+is)\s+the\s+(correct\s+|right\s+|final\s+)?answer\b/i,
  /\bi\s+give\s+up\b/i,
  /\b(answer|javabu|jawabu|samadhanam)\s*(ne\s*)?(cheppu|cheppandi|chepu|chepandi|cheppeyi|ivvu|ivvandi)\b/i,
  /\bdirect\s*(ga\s*)?(cheppu|cheppandi|chepu|chepandi)\b/i,
  /(సమాధానం|జవాబు|ఆన్సర్)\s*(నే\s*)?(చెప్పు|చెప్పండి|చెప్పేయ్|ఇవ్వు|ఇవ్వండి)/,
  /నేరుగా\s*చెప్ప/,
];

export function askedForAnswer(text: string): boolean {
  return ASK_FOR_ANSWER.some((re) => re.test(text));
}

export function planTurn(input: Pick<SocraticInput, 'message' | 'history' | 'hintsGiven'>): TurnPlan {
  if (askedForAnswer(input.message) || input.hintsGiven >= MAX_HINTS) return 'reveal';
  return input.history?.length ? 'respond' : 'open';
}

// Eval 2026-11-14 run 1: "name the key word" made hints state the definition (24% early
// reveals), so every rung now keeps the answer for the student to say.
const HINT_LADDER = [
  'This is hint 1: a small nudge: an everyday example or the first idea to think about.',
  'This is hint 2: a stronger clue: point to what happens in the textbook example, still without the definition.',
  'This is hint 3: a fill-in-the-blank sentence with the key word or idea left as ___ for the student to fill in.',
];

const NO_ANSWER_RULE =
  'A question or hint NEVER contains the answer from "answer": do not write the definition, the explanation, the final fact or a ' +
  'sentence like "this is called ..." / "this happens because ...". The student must still say it. ' +
  'End with ONE question. Do not repeat a question you already asked: make it easier instead. ' +
  'Example for "What is thermal decomposition?": BAD "When a substance breaks down on heating it is called thermal decomposition. Can you give an example?" ' +
  'GOOD "What do you think happens to limestone when we heat it strongly?"';

function planRules(plan: TurnPlan, hintsGiven: number): string[] {
  if (plan === 'open') {
    return [
      'THIS TURN: the student just asked the question. Do NOT answer it, not even partly.',
      'Ask ONE short guiding question that starts the student thinking (about something they already know, an everyday example, or the first step). Set "kind": "question" and "studentCorrect": null.',
      NO_ANSWER_RULE,
    ];
  }
  if (plan === 'reveal') {
    return [
      'THIS TURN: the student gets the full answer now. Write the full answer to the student\'s ORIGINAL question in "answer" (the definition or explanation, even if parts were said before), in 1 or 2 short sentences. "reply": only ONE short encouraging sentence of at most 8 words (e.g. "Good try! Here is the answer."): the app shows "answer" right after it. Set "kind": "reveal". Set "studentCorrect" to null unless the student also gave an answer to check.',
    ];
  }
  const ladder = HINT_LADDER[Math.min(hintsGiven, HINT_LADDER.length - 1)];
  return [
    'THIS TURN: read the student\'s latest message and do exactly one of these:',
    // Grading studies: a rubric alone makes LLM graders too strict; rubric + an example works
    // best. The example topic is deliberately NOT in the eval set.
    '- The student\'s answer is correct: compared with "answer", it has the main point, even in simple or imperfect words, with small details missing or extra details added. If an extra detail is a little off, it is STILL correct: confirm it and fix the small detail gently in the same reply. Do not ask for more or for a different form (a formula, a symbol, an exact wording). ' +
      'Example: question "Which gas forms when zinc reacts with dilute sulphuric acid?", student "hydrogen, and it needs heat": correct ("studentCorrect": true): "Yes, hydrogen gas! It forms even without heating."',
    '  Confirm in 1 or 2 sentences using the textbook, with praise and no new question. "kind": "feedback", "studentCorrect": true.',
    `- The answer is wrong or misses the main point: say kindly what is good (if anything) and that it is not quite right, in a few words, WITHOUT giving the correct explanation; then give the next hint. "kind": "hint", "studentCorrect": false. ${ladder}`,
    `- The student does not know, is confused or asks for a hint: give the next hint. "kind": "hint", "studentCorrect": null. ${ladder}`,
    '- The student clearly asks you to just tell the answer: "kind": "reveal", and "reply" is only ONE short encouraging sentence of at most 8 words (the app shows "answer" right after it).',
    `For a hint: ${NO_ANSWER_RULE}`,
  ];
}

function buildSystem(input: SocraticInput, plan: TurnPlan): string {
  return [
    'You are a friendly science tutor for a Class 10 student (CBSE / Andhra Pradesh, NCERT Science textbook) in SOCRATIC mode: you help the student find the answer by thinking, step by step, instead of telling it at once.',
    'Keep every reply short: at most 3 short sentences in plain Class 10 language. Ask at most ONE question per reply.',
    LANGUAGE_RULE[input.language].replace('Write the answer', 'Write your reply').replace('Answer the same way', 'Reply the same way'),
    'You get numbered passages from the student\'s textbook. Everything you say must agree with them; copy formulas, signs and units exactly as they are written there.',
    ...planRules(plan, input.hintsGiven),
    'Never mock the student or make them feel bad. Never just say "wrong": say what is good first, then correct kindly.',
    'Never talk about "the passages" (the student does not see them). Do not write citations, passage numbers or page numbers inside "reply": the app shows them.',
    '"answer": first write the correct answer to the student\'s question in 1 to 3 short, simple sentences, from the textbook, in the same language as "reply". The student never sees this field, except on a reveal turn; use it to judge the student\'s reply.',
    '"sources": the passage numbers your reply relies on. "inTextbook": true if the passages cover this topic.',
    'Return only JSON, in this order: {"answer": "...", "studentCorrect": null, "kind": "question", "reply": "...", "sources": [1], "inTextbook": true}',
    DATA_RULE,
  ].join('\n');
}

function buildUser(input: SocraticInput, plan: TurnPlan): string {
  const history = (input.history ?? []).slice(-8)
    .map((t) => `${t.role === 'student' ? 'Student' : 'Tutor'}: ${t.text.slice(0, 500)}`).join('\n');
  return [
    `Textbook passages:\n${formatPassages(input.passages)}`,
    `The student's question (topic of this conversation):\n${fence(input.topic)}`,
    history ? `Conversation so far:\n${fence(history)}` : '',
    plan !== 'open' ? `Student's latest message:\n${fence(input.message)}` : '',
    plan === 'respond' ? `Hints given so far: ${input.hintsGiven} of ${MAX_HINTS}.` : '',
  ].filter(Boolean).join('\n\n');
}

// A question or hint must leave the answer for the student to say. In eval runs 1-3
// (2026-11-14) Sarvam kept adding a defining sentence to hints in all three languages
// ("This is called thermal decomposition", "... విఘటన చర్య అంటారు", "... antaru"), so code
// removes such sentences. Fill-in-the-blank sentences ("___") are hints and stay.
const DEFINING = /\b(is|are)\s+(called|known\s+as|termed)\b|అంటారు|అని\s*పిలుస్తారు|\bantaru\b|\bpilustaru\b/i;

// Split only where punctuation is followed by a space, so formulas like "CaSO4.2H2O" and
// decimals stay whole (eval run 8: a mid-formula split garbled a Telugu hint).
const splitSentences = (text: string) => text.split(/(?<=[.!?।])\s+/).map((s) => `${s} `);

/** The reply without defining sentences; '' when nothing useful is left. */
export function stripDefinitions(reply: string): string {
  const kept = splitSentences(reply).filter((s) => s.includes('___') || !DEFINING.test(s)).join('').trim();
  return kept.length >= 15 ? kept : '';
}

// Second guard, in code (research on Socratic LLM tutors, 2026: a prompt alone does not stop
// answer leakage; enforce it outside the model). A statement in a hint that repeats at least
// half of the key words of the model's own hidden "answer" gives the answer away: drop it.
// Questions and fill-in-the-blank sentences stay (they leave the answer to the student).
const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'its', 'that', 'this', 'with', 'from', 'when', 'what', 'why', 'how', 'into', 'than',
  'was', 'were', 'which', 'will', 'can', 'you', 'your', 'they', 'them', 'their', 'has', 'have', 'because', 'also',
  'not', 'but', 'one', 'some', 'there', 'these', 'those', 'all', 'more', 'most', 'very', 'such', 'other',
  'kada', 'adi', 'idi', 'emi', 'ante', 'mariyu', 'valla', 'kani', 'anduke',
]);
export const LEAK_SHARE = 0.5;

function keyWords(text: string): Set<string> {
  // \p{M}: Telugu vowel signs are combining marks; without it Telugu words split apart.
  return new Set((text.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).filter((w) => w.length >= 3 && !STOPWORDS.has(w)));
}

/** The reply without statements that restate the hidden answer; '' when nothing useful is left. */
export function stripAnswerLeaks(reply: string, hiddenAnswer: string): string {
  const answerWords = keyWords(hiddenAnswer);
  if (answerWords.size < 3) return reply;
  const leaks = (s: string) => {
    if (s.includes('___') || s.trim().endsWith('?')) return false;
    const words = keyWords(s);
    let hits = 0;
    for (const w of answerWords) if (words.has(w)) hits++;
    return hits / answerWords.size >= LEAK_SHARE;
  };
  const kept = splitSentences(reply).filter((s) => !leaks(s)).join('').trim();
  return kept.length >= 15 ? kept : '';
}

/** Deterministic part: the plan decides what the turn may be; citations come from our passages. */
export function finalizeSocratic(out: ModelOutput, input: SocraticInput): SocraticOutput {
  const plan = planTurn(input);
  let kind: SocraticKind = out.kind;
  let studentCorrect = out.studentCorrect;
  if (plan === 'open') {
    studentCorrect = null; // nothing to judge yet
    if (kind === 'feedback' || kind === 'hint') kind = 'question';
  } else if (plan === 'reveal') {
    kind = 'reveal';
  } else if (studentCorrect === true && kind !== 'reveal') {
    kind = 'feedback';
  } else if (kind === 'feedback') {
    kind = 'hint'; // "feedback" without a correct answer is a hint
  }
  // A reveal is the model's short encouragement + the hidden answer, so it always contains the
  // answer (eval run 4: one reveal turn came back as more guiding questions).
  const hiddenAnswer = out.answer.trim();
  const text = kind === 'reveal' && hiddenAnswer ? `${out.reply.trim()} ${hiddenAnswer}` : out.reply;
  const base = finalize({ answer: text, inTextbook: out.inTextbook, sources: out.sources, relatedPassage: null }, input);
  let reply = base.answer;
  if (kind === 'question' || kind === 'hint') {
    // Only the answer was left: send the textbook-page pointer as the hint instead.
    reply = stripAnswerLeaks(stripDefinitions(reply), hiddenAnswer) || (input.passages[0] ? POINTER[input.language](input.passages[0]) : reply);
  }
  return {
    reply, kind, studentCorrect, hiddenAnswer,
    done: kind === 'feedback' || kind === 'reveal',
    hintsGiven: input.hintsGiven + (kind === 'hint' ? 1 : 0),
    plan,
    inTextbook: base.inTextbook, citations: base.citations, label: base.label, related: base.related, droppedSources: base.droppedSources,
  };
}

const POINTER: Record<Language, (h: ChunkHit) => string> = {
  en: (h) => `Let's find it in your textbook: read Chapter ${h.chapter_number ?? ''} (${h.chapter_title_en}), "${h.section_path ?? 'introduction'}", page ${h.page_start}. What does it say? Tell me in your own words.`,
  te: (h) => `మీ పాఠ్యపుస్తకంలో చూద్దాం: అధ్యాయం ${h.chapter_number ?? ''} (${h.chapter_title_en}), "${h.section_path ?? 'introduction'}", పేజీ ${h.page_start} చదవండి. అది ఏమి చెబుతోంది? మీ మాటల్లో చెప్పండి.`,
  te_latn: (h) => `Mana textbook lo chuddam: Chapter ${h.chapter_number ?? ''} (${h.chapter_title_en}), "${h.section_path ?? 'introduction'}", page ${h.page_start} chadavandi. Adi emi chebutondi? Mee maatallo cheppandi.`,
};

function fromTutorShape(o: { answer: string; inTextbook: boolean; citations: Citation[]; label: string | null; related: Citation | null; droppedSources: number }, input: SocraticInput, plan: TurnPlan): SocraticOutput {
  return {
    reply: o.answer, kind: 'reveal', studentCorrect: null, done: true, hintsGiven: input.hintsGiven, plan, hiddenAnswer: '',
    inTextbook: o.inTextbook, citations: o.citations, label: o.label, related: o.related, droppedSources: o.droppedSources,
  };
}

export const socraticSpec: JsonAgentSpec<SocraticInput, SocraticOutput, ModelOutput> = {
  name: 'socratic',
  task: 'socratic',
  schema: ModelOutput,
  buildMessages: (input) => {
    const plan = planTurn(input);
    return [
      { role: 'system', content: buildSystem(input, plan) },
      { role: 'user', content: buildUser(input, plan) },
    ];
  },
  callOverrides: () => ({ maxTokens: SOCRATIC_MAX_TOKENS }),
  postProcess: finalizeSocratic,
  // Model down: keep teaching without it. Point to the exact textbook page (metadata, not
  // model text) and ask for the student's own words; when the answer is due, quote the book.
  fallback: (input) => {
    const plan = planTurn(input);
    const top = input.passages[0];
    if (top && plan !== 'reveal') {
      const kind: SocraticKind = plan === 'open' ? 'question' : 'hint';
      return {
        reply: POINTER[input.language](top), kind, studentCorrect: null, done: false, hiddenAnswer: '',
        hintsGiven: input.hintsGiven + (kind === 'hint' ? 1 : 0), plan,
        inTextbook: true, citations: [citationOf(top)], label: null, related: null, droppedSources: 0,
      };
    }
    const tutorFallback = tutorSpec.fallback({ question: input.message, language: input.language, wantsDetail: false, passages: input.passages, status: input.status });
    return fromTutorShape(tutorFallback, input, plan);
  },
};

export async function runSocratic(input: SocraticInput, ctx?: AgentContext): Promise<AgentRun<SocraticOutput>> {
  if (input.status === 'none' || !input.passages.length) {
    // Not a textbook topic: no guided questions, just the tutor's labelled short answer.
    const run = await runTutor({
      question: input.message, language: input.language, wantsDetail: false,
      passages: input.passages, status: input.status, history: input.history,
    }, ctx);
    return { ...run, output: fromTutorShape(run.output, input, planTurn(input)) };
  }
  return runJsonAgent(socraticSpec, input, ctx);
}
