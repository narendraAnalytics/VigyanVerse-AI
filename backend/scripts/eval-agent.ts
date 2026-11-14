// Live eval for one agent, run on its own before it is connected (Phase 3 testing level 2).
//
//   npm run eval:agent -- router                              production model (models.ts)
//   npm run eval:agent -- router --model gemma4               compare another model
//   npm run eval:agent -- router --model sarvam-105b --reasoning none
//   npm run eval:agent -- router --only r07,r31 --save
//   npm run eval:agent -- retrieval --tune --save            calibrate 'not in the textbook'
//   npm run eval:agent -- socratic --only s01,s08 --save     scripted multi-turn conversations
//
// Results are saved with --save to data/eval/results/<agent>-<date>-<model>.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import type { AgentContext } from '../src/agents/kit.ts';
import { MODEL_ROUTES } from '../src/shared/models.ts';
import { evalMath } from './evals/math.ts';
import { evalQuiz } from './evals/quiz.ts';
import { evalRetrieval } from './evals/retrieval.ts';
import { evalRouter } from './evals/router.ts';
import { evalSocratic } from './evals/socratic.ts';
import { evalTurn } from './evals/turn.ts';
import { evalTutor } from './evals/tutor.ts';
import { evalQuizflow } from './evals/quizflow.ts';
import { evalValidator } from './evals/validator.ts';

const argv = process.argv.slice(2);
const option = (name: string) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const agent = argv[0];
const EVALS = { router: evalRouter, retrieval: evalRetrieval, tutor: evalTutor, socratic: evalSocratic, math: evalMath, turn: evalTurn, quiz: evalQuiz, validator: evalValidator, quizflow: evalQuizflow } as const;

if (!agent || !(agent in EVALS)) {
  console.error(`Usage: npm run eval:agent -- <${Object.keys(EVALS).join('|')}> [--model m] [--reasoning none|low] [--only ids] [--save]`);
  process.exit(1);
}
const model = option('--model');
const reasoning = option('--reasoning') as AgentContext['overrides'] extends infer O ? O extends { reasoningEffort?: infer R } ? R : never : never;
const ctx: AgentContext = model ? { overrides: { model, reasoningEffort: reasoning ?? null } } : {};

const result = await EVALS[agent as keyof typeof EVALS](ctx, { only: option('--only')?.split(','), tune: argv.includes('--tune'), save: argv.includes('--save') });

if (argv.includes('--save')) {
  const used = model ?? MODEL_ROUTES[agent as keyof typeof MODEL_ROUTES]?.model ?? 'default';
  const dir = new URL('../data/eval/results/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  const file = new URL(`${agent}-${new Date().toISOString().slice(0, 10)}-${used}${reasoning ? `-${reasoning}` : ''}.json`, dir);
  writeFileSync(file, JSON.stringify({ agent, model: used, reasoning: reasoning ?? null, ranAt: new Date().toISOString(), ...result }, null, 2) + '\n');
  console.log(`saved ${file.pathname}`);
}
