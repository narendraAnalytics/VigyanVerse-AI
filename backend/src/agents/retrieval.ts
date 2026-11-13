// Agent 2: Curriculum Retrieval (projectOverview.txt §7). Deterministic code agent: no LLM
// call of its own (the router already produced English keywords for Telugu script).
//
//   keywords  : Telugu script -> router keywords; otherwise the question's own words
//   search    : match_chunks_weighted (IDF-weighted; user-scoped client, RLS applies)
//   subject   : screen subject is a hard filter; a router-guessed subject is retried
//               without the filter when the filtered search finds no good context
//   status    : grounded | weak | none  ("is this answered by the textbook?") from COVERAGE:
//               the IDF weight of the question's lexemes found in the best single chunk,
//               divided by the weight of all its lexemes. Rare words decide: a question
//               about "Mendeleev's periodic law" whose rare words appear nowhere is "none"
//               even if common words ("law") match. Same stemming as the search (Postgres).
//
// The tutor uses `status` to decide whether it may answer (citations come only from `hits`).
import { needsRewrite, sanitizeKeywords, searchChunks, type ChunkHit, type RpcClient } from '../shared/retrieval.ts';
import type { Subject } from './router.ts';

export interface ContextAssessment {
  status: 'grounded' | 'weak' | 'none';
  /** Weighted rank of the top chunk (not bounded; for logging). */
  topScore: number;
  /** IDF share of the question's lexemes present in the best of the top 3 chunks (0..1). */
  coverage: number;
  /** Query lexemes (Postgres stems), rarest first. */
  terms: string[];
  /** Query lexemes missing from the best chunk, rarest first. */
  missingTerms: string[];
}

/**
 * Calibrated 2026-11-13 on retrieval-v1 (150 in-book) vs out-of-book-v1 (36): see
 * backendplan.txt 3c. Tune only with `npm run eval:agent -- retrieval --tune`.
 */
export const CONTEXT_THRESHOLDS = {
  /** coverage >= this: the textbook answers it. */
  groundedCoverage: 0.75,
  /** coverage < this: the textbook does not cover it. */
  noneCoverage: 0.5,
};

export function assessContext(hits: readonly ChunkHit[], t = CONTEXT_THRESHOLDS): ContextAssessment {
  const weights = hits[0]?.query_weights ?? {};
  const terms = Object.keys(weights).sort((a, b) => weights[b] - weights[a]);
  const total = terms.reduce((s, k) => s + weights[k], 0);
  let best = { coverage: 0, matched: new Set<string>() };
  for (const h of hits.slice(0, 3)) {
    const matched = new Set(h.matched_lexemes ?? []);
    const coverage = total ? terms.filter((k) => matched.has(k)).reduce((s, k) => s + weights[k], 0) / total : 0;
    if (coverage > best.coverage) best = { coverage, matched };
  }
  const status = !hits.length || best.coverage < t.noneCoverage ? 'none' : best.coverage >= t.groundedCoverage ? 'grounded' : 'weak';
  return { status, topScore: hits[0]?.rank ?? 0, coverage: best.coverage, terms, missingTerms: terms.filter((k) => !best.matched.has(k)) };
}

export interface RetrievalInput {
  question: string;
  /** From the router: English keywords (used for Telugu, in either script) and its subject guess. */
  routerKeywords?: string[];
  routerSubject?: Subject | null;
  /** From the router: 'te_latn' = Telugu typed in English letters. */
  routerLanguage?: 'en' | 'te' | 'te_latn';
  /** Subject of the screen the student chose: a hard filter. */
  screenSubject?: Subject;
}

export interface RetrievalOutput extends ContextAssessment {
  hits: ChunkHit[];
  keywords: string[];
  keywordSource: 'router' | 'question';
  subjectFilter: Subject | null;
  /** True when the router's subject was dropped because the filtered search was poor. */
  subjectRetried: boolean;
}

const rankOf = (a: ContextAssessment) => ({ grounded: 2, weak: 1, none: 0 })[a.status] + a.coverage;

export async function retrieveContext(client: RpcClient, input: RetrievalInput, opts: { board?: string; limit?: number } = {}): Promise<RetrievalOutput> {
  // Telugu in either script: the router's English keywords. Tenglish words ("ela tayaru
  // chestaru") never occur in the book, so as search terms they would look like rare missing
  // words and wrongly mark an in-book question "none" (eval 2026-11-13: 4 of 6 false nones).
  // If the router gave no keywords (fallback), use the question's own words.
  const routerKw = sanitizeKeywords(input.routerKeywords ?? []);
  const useRouter = (needsRewrite(input.question) || input.routerLanguage === 'te_latn') && routerKw.length > 0;
  const keywords = useRouter ? routerKw : sanitizeKeywords([input.question]);
  const keywordSource = useRouter ? 'router' : 'question';
  const search = (subject: Subject | null) =>
    searchChunks(client, keywords, { board: opts.board ?? 'CBSE', subject: subject ?? undefined, limit: opts.limit ?? 5 });

  const subjectFilter = input.screenSubject ?? input.routerSubject ?? null;
  let hits = await search(subjectFilter);
  let assessment = assessContext(hits);
  let subjectRetried = false;
  if (!input.screenSubject && subjectFilter && assessment.status !== 'grounded') {
    const wideHits = await search(null);
    const wide = assessContext(wideHits);
    if (rankOf(wide) > rankOf(assessment)) {
      hits = wideHits;
      assessment = wide;
      subjectRetried = true;
    }
  }
  return { ...assessment, hits, keywords, keywordSource, subjectFilter: subjectRetried ? null : subjectFilter, subjectRetried };
}
