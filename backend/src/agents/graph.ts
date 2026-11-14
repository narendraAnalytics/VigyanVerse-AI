// One student turn as a LangGraph.js StateGraph (owner decision 2026-11-13):
//
//   START -> route -+-> reply (greeting / off_topic / unsafe / quiz: fixed text, no AI answer)
//                   +-> retrieve -+-> socratic  (Socratic conversation, or an open Socratic thread)
//                                 +-> math      (intent "numerical")
//                                 +-> tutor     (everything else)
//
// Nodes are pure (state in -> partial state out); the model client, the textbook search and
// the clock are injected, so the graph is unit-tested with mocks. Saving messages and usage
// is the Edge Function's job (src/functions/tutor-chat), not the graph's.
import { Annotation, END, START, StateGraph, type LangGraphRunnableConfig } from '@langchain/langgraph';
import type { RetrievalInput, RetrievalOutput } from './retrieval.ts';
import type { AgentContext, AgentRun, AgentUsage, ChatFn } from './kit.ts';
import { runMath, type MathOutput } from './math.ts';
import { routeMessage, type RouterOutput, type Subject } from './router.ts';
import { runSocratic, type SocraticOutput } from './socratic.ts';
import { runTutor, type Citation, type Language, type TutorOutput, type Turn } from './tutor.ts';

export interface TurnInput {
  message: string;
  mode: 'tutor' | 'socratic';
  /** Subject of the screen the student is on (a hard search filter). */
  subject?: Subject;
  /** Recent turns of this conversation, oldest first. */
  history: Turn[];
  /** Open Socratic thread (from the conversation row): its question and hints given so far. */
  socratic: { topic: string | null; hints: number };
}

export interface TurnDeps {
  chat?: ChatFn;
  retrieve(input: RetrievalInput): Promise<RetrievalOutput>;
  /** Milliseconds left for this turn; each model call gets at most this (30 s function limit). */
  timeLeft(): number;
}

export type AgentName = 'router' | 'tutor' | 'socratic' | 'math';
export interface UsageRow extends Partial<AgentUsage> { agent: AgentName; usedFallback: boolean; error?: string }

export interface TurnResult {
  agent: AgentName;
  reply: string;
  language: Language;
  citations: Citation[];
  /** "Not from your Class 10 textbook" label, when it applies. */
  label: string | null;
  related: Citation | null;
  /** Small facts for the UI and analytics (intent, kind, check, done...). */
  meta: Record<string, unknown>;
  /** Socratic thread state to save on the conversation. */
  socratic: { topic: string | null; hints: number };
}

const FIXED_INTENTS = new Set(['greeting', 'off_topic', 'unsafe', 'quiz']);

// Owner rule: an unsafe message (self-harm, hurting someone...) gets a kind reply with the
// India Tele-MANAS helpline: 14416 / 1-800-891-4416, free, 24x7 (Ministry of Health; checked
// 2026-11-14). Telugu wording written by the assistant: native review pending.
export const FIXED_REPLIES: Record<'greeting' | 'off_topic' | 'unsafe' | 'quiz', Record<Language, string>> = {
  greeting: {
    en: 'Hi! Ask me any Class 10 Science question: physics, chemistry or biology.',
    te: 'నమస్తే! 10వ తరగతి సైన్స్ (భౌతిక, రసాయన, జీవ శాస్త్రం) గురించి ఏ ప్రశ్న అయినా అడగండి.',
    te_latn: 'Namaste! Class 10 Science (physics, chemistry, biology) gurinchi e question aina adagandi.',
  },
  off_topic: {
    en: 'I can only help with Class 10 Science (physics, chemistry and biology). Ask me a science question!',
    te: 'నేను 10వ తరగతి సైన్స్ (భౌతిక, రసాయన, జీవ శాస్త్రం) లో మాత్రమే సహాయం చేయగలను. ఒక సైన్స్ ప్రశ్న అడగండి!',
    te_latn: 'Nenu Class 10 Science (physics, chemistry, biology) lo matrame help cheyagalanu. Oka science question adagandi!',
  },
  unsafe: {
    en: "I can't help with that. If you are feeling upset or unsafe, please talk to a parent, a teacher or someone you trust. You can also call Tele-MANAS on 14416 (free, any time, in your language).",
    te: 'నేను దీనికి సహాయం చేయలేను. మీకు బాధగా లేదా భయంగా అనిపిస్తే, మీ తల్లిదండ్రులు, టీచర్ లేదా మీరు నమ్మే వారితో మాట్లాడండి. Tele-MANAS కు 14416 నంబర్‌కు ఎప్పుడైనా ఉచితంగా కాల్ చేయవచ్చు (తెలుగులో కూడా).',
    te_latn: 'Nenu deeniki help cheyalenu. Meeku badha ga leda bhayam ga anipisthe, mee parents, teacher leda meeru nammina vallatho matladandi. Tele-MANAS ki 14416 ki eppudaina free ga call cheyochu (Telugu lo kuda).',
  },
  quiz: {
    en: 'Practice quizzes are coming soon. For now, ask me any Class 10 Science question!',
    te: 'ప్రాక్టీస్ క్విజ్‌లు త్వరలో వస్తాయి. ఇప్పటికి 10వ తరగతి సైన్స్ ప్రశ్న ఏదైనా అడగండి!',
    te_latn: 'Practice quizzes twaralo vastayi. Ippatiki Class 10 Science question edaina adagandi!',
  },
};

const State = Annotation.Root({
  input: Annotation<TurnInput>,
  routed: Annotation<RouterOutput>,
  retrieval: Annotation<RetrievalOutput>,
  result: Annotation<TurnResult>,
  usage: Annotation<UsageRow[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
});
type S = typeof State.State;

function usageOf(agent: AgentName, run: AgentRun<unknown>): UsageRow[] {
  if (!run.usage && !run.error) return [];
  return [{ agent, ...run.usage, usedFallback: run.source === 'fallback', error: run.error?.slice(0, 300) }];
}

/** Is this turn part of a Socratic thread (an open one, or a new question in Socratic mode)? */
function socraticTurn(s: S): boolean {
  return !!s.input.socratic.topic || (s.input.mode === 'socratic' && s.routed.intent !== 'numerical');
}

// Per-request dependencies travel as LangGraph runtime CONTEXT (config.context), so the graph
// is compiled once per isolate and reused (LangGraph JS docs: graph-api, runtime context).
const Context = Annotation.Root({ deps: Annotation<TurnDeps> });
type Config = LangGraphRunnableConfig<typeof Context.State>;

function depsOf(config: Config): TurnDeps {
  const deps = config.context?.deps;
  if (!deps) throw new Error('turn graph: context.deps is missing');
  return deps;
}
const agentCtx = (config: Config): AgentContext => {
  const deps = depsOf(config);
  return { chat: deps.chat, overrides: { budgetMs: deps.timeLeft() } };
};

const FIXED_TEXTS = new Set(Object.values(FIXED_REPLIES).flatMap((r) => Object.values(r)));

/**
 * The student's last real question: skips messages that got a fixed reply (greeting,
 * off-topic, unsafe). Turn eval 2026-11-14: after an unsafe message, the next ordinary answer
 * was routed "unsafe" again because the router saw the unsafe message as context.
 */
export function lastQuestion(history: readonly Turn[]): string | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== 'student') continue;
    const answer = history[i + 1];
    if (answer?.role === 'tutor' && FIXED_TEXTS.has(answer.text)) continue;
    return history[i].text;
  }
  return undefined;
}

const route = async (s: S, config: Config): Promise<Partial<S>> => {
  const previous = lastQuestion(s.input.history);
  const run = await routeMessage({ message: s.input.message, subjectHint: s.input.subject, previousMessage: previous }, agentCtx(config));
  return { routed: run.output, usage: usageOf('router', run) };
};

const reply = (s: S): Partial<S> => {
  const intent = s.routed.intent as keyof typeof FIXED_REPLIES;
  return {
    result: {
      agent: 'router', reply: FIXED_REPLIES[intent][s.routed.language], language: s.routed.language,
      citations: [], label: null, related: null, meta: { intent },
      // An unsafe or off-topic message does not end a Socratic thread.
      socratic: s.input.socratic,
    },
  };
};

const retrieve = async (s: S, config: Config): Promise<Partial<S>> => {
  // Search for what the turn is ABOUT: an open Socratic thread's question; a follow-up
  // ("give an example") together with the previous question; otherwise the message.
  const previous = lastQuestion(s.input.history);
  const question = s.input.socratic.topic ?? (s.routed.intent === 'follow_up' && previous ? `${previous} ${s.input.message}` : s.input.message);
  const retrieval = await depsOf(config).retrieve({
    question, routerKeywords: s.routed.keywords, routerSubject: s.routed.subject,
    routerLanguage: s.routed.language, screenSubject: s.input.subject,
  });
  return { retrieval };
};

const tutor = async (s: S, config: Config): Promise<Partial<S>> => {
  // A follow-up ("give an example") is about the previous question: say so, or the tutor
  // labels a textbook topic "not from your textbook" (known 3d issue; turn eval 2026-11-14).
  const previous = lastQuestion(s.input.history);
  const question = s.routed.intent === 'follow_up' && previous ? `${s.input.message} (about: ${previous})` : s.input.message;
  const run = await runTutor({
    question, language: s.routed.language, wantsDetail: s.routed.wantsDetail,
    passages: s.retrieval.hits, status: s.retrieval.status, history: s.input.history,
  }, agentCtx(config));
  const o: TutorOutput = run.output;
  return {
    usage: usageOf('tutor', run),
    result: {
      agent: 'tutor', reply: o.answer, language: s.routed.language, citations: o.citations, label: o.label, related: o.related,
      meta: { intent: s.routed.intent, inTextbook: o.inTextbook, retrieval: s.retrieval.status, source: run.source },
      socratic: { topic: null, hints: 0 },
    },
  };
};

const socratic = async (s: S, config: Config): Promise<Partial<S>> => {
  const topic = s.input.socratic.topic ?? s.input.message;
  const run = await runSocratic({
    topic, message: s.input.message, language: s.routed.language, passages: s.retrieval.hits, status: s.retrieval.status,
    history: s.input.socratic.topic ? s.input.history : [], hintsGiven: s.input.socratic.topic ? s.input.socratic.hints : 0,
  }, agentCtx(config));
  const o: SocraticOutput = run.output;
  return {
    usage: usageOf('socratic', run),
    result: {
      agent: 'socratic', reply: o.reply, language: s.routed.language, citations: o.citations, label: o.label, related: o.related,
      // hiddenAnswer is NEVER sent to the student; it is kept out of meta on purpose.
      meta: { intent: s.routed.intent, kind: o.kind, studentCorrect: o.studentCorrect, done: o.done, plan: o.plan, retrieval: s.retrieval.status, source: run.source },
      socratic: o.done ? { topic: null, hints: 0 } : { topic, hints: o.hintsGiven },
    },
  };
};

const math = async (s: S, config: Config): Promise<Partial<S>> => {
  const run = await runMath({
    question: s.input.message, language: s.routed.language, passages: s.retrieval.hits, status: s.retrieval.status, history: s.input.history,
  }, agentCtx(config));
  const o: MathOutput = run.output;
  return {
    usage: usageOf('math', run),
    result: {
      agent: 'math', reply: o.reply, language: s.routed.language, citations: o.citations, label: null, related: null,
      meta: { intent: s.routed.intent, type: o.type, check: o.check, answer: o.answer, source: run.source },
      socratic: s.input.socratic,
    },
  };
};

/** Compiled once; START -> route -> reply | retrieve -> socratic | math | tutor -> END (no loops). */
export const turnGraph = new StateGraph(State, Context)
    .addNode('route', route)
    .addNode('reply', reply)
    .addNode('retrieve', retrieve)
    .addNode('tutor', tutor)
    .addNode('socratic', socratic)
    .addNode('math', math)
    .addEdge(START, 'route')
    .addConditionalEdges('route', (s: S) => (FIXED_INTENTS.has(s.routed.intent) ? 'reply' : 'retrieve'), ['reply', 'retrieve'])
    .addConditionalEdges('retrieve', (s: S) => (socraticTurn(s) ? 'socratic' : s.routed.intent === 'numerical' ? 'math' : 'tutor'), ['socratic', 'math', 'tutor'])
    .addEdge('reply', END)
    .addEdge('tutor', END)
    .addEdge('socratic', END)
    .addEdge('math', END)
  .compile();

/** Run one turn: the answer plus one usage row per model call (for model_usage). */
export async function runTurn(input: TurnInput, deps: TurnDeps): Promise<TurnResult & { usage: UsageRow[]; intent: string }> {
  // The graph has no cycles (at most 3 steps): a low recursion limit is a cheap guard.
  const out = await turnGraph.invoke({ input }, { context: { deps }, recursionLimit: 10 });
  return { ...out.result, usage: out.usage, intent: out.routed.intent };
}
