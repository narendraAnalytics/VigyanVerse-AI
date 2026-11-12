# VigyanVerse AI

**A multilingual AI learning platform for Class 10 Science, in English and Telugu.**

VigyanVerse AI helps Class 10 students understand Physics, Chemistry and Biology, not just memorise
answers. It combines a textbook-grounded AI tutor, Socratic questioning, generated quizzes with
verified answer keys, mistake classification and topic-level mastery tracking. It is built for
CBSE and Andhra Pradesh SSC students.

> **Core philosophy:** Teach concepts. Identify gaps. Adapt learning. Measure improvement.

---

## Status

Early development. The backend foundation is in place; the frontend has not been started.

| Area | State |
|---|---|
| InsForge backend project (Nano compute) | ✅ Linked and running |
| Model routing + Sarvam AI client | ✅ All 7 routed models smoke-tested |
| Deterministic verification (units, equation balancing) | ✅ 13 unit tests passing |
| Identity, roles, parent linking, parental consent (schema + RLS) | ✅ Applied and security-checked |
| CBSE Class 10 Science 2026-27 curriculum seed | ✅ 14 chapters |
| AP SSC curriculum, Telugu chapter titles | ⏳ Waiting for official sources |
| Knowledge base (pgvector hybrid search) | ⏳ Next |
| AI tutor, quizzes, mastery, documents, voice | ⏳ Planned |
| Frontend (Next.js) | ⏳ Planned |

## Key ideas

- **Grounded, not guessed.** Answers are generated from retrieved textbook passages, and
  citations come from stored chunk metadata, never from the model.
- **LLMs explain, code verifies.** Numeric answers (with unit conversion) and chemical equation
  balancing are checked by deterministic TypeScript, not trusted from the model.
- **Hybrid retrieval.** Planned pgvector semantic search combined with Postgres full-text search,
  merged by Reciprocal Rank Fusion, so exact terms like `Fe3O4` and paraphrases both work.
- **Child-safe by design.** Every table has row-level security. Parents link to a student with a
  one-time invite code, consent is an append-only record per purpose, and AI features are gated
  on active parental consent.
- **Cost-aware model routing.** Each task is routed to the cheapest model that does it well, with
  fallbacks and per-call cost and latency tracking in ₹.

## Tech stack

| Layer | Technology |
|---|---|
| Backend platform | [InsForge](https://insforge.dev): Postgres, Auth, Storage, Edge Functions (Deno), Realtime |
| Compute | InsForge Nano (2 vCPU, 0.5 GB), scaled up only on real demand |
| Database | PostgreSQL 15 + pgvector, row-level security |
| AI models | [Sarvam AI Token Factory](https://docs.sarvam.ai/api/token-factory) (OpenAI-compatible) |
| Language | TypeScript (Node 22 for tooling, Deno for Edge Functions) |
| Validation & verification | zod, mathjs, custom chemical equation balancer |
| Testing | vitest, live end-to-end RLS test script |
| Frontend (planned) | Next.js, TypeScript, Tailwind CSS |

### Model routing

| Task | Model |
|---|---|
| Tutor, Socratic mode, answer validation | `sarvam-105b` (thinking disabled) |
| Quiz generation, maths reasoning | `deepseekv4.1-flash-1017` |
| Routing, mistake classification | `glm5.3-flash` |
| Diagram / image understanding | `gemma4` |
| Voice dialogue | `sarvam-105b-conversations` |

## Repository structure

```
vigyanverseai/
├── README.md
└── backend/
    ├── migrations/          SQL migrations (schema, RLS, seed data)
    ├── src/
    │   ├── functions/       Edge Functions, one folder per endpoint
    │   ├── shared/          env, HTTP/auth helpers, model registry, LLM client
    │   └── verify/          deterministic numeric + chemistry verification
    ├── scripts/             function bundler/deployer, smoke & end-to-end tests
    └── tests/               unit tests
```

## Getting started (backend)

Prerequisites: Node.js 22+, an InsForge account, and a Sarvam AI API key.

```bash
cd backend
npm install

# Log in and link the InsForge project
npx -y @insforge/cli login
npx -y @insforge/cli link --project-id <your-project-id>

# Local secrets for scripts
cp .env.example .env              # then set SARVAM_API_KEY

# Secrets for deployed Edge Functions
npx -y @insforge/cli secrets add SARVAM_API_KEY <key>

# Apply the database schema
npm run db:up
```

### Common commands

| Command | Purpose |
|---|---|
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests |
| `npm run smoke:sarvam` | One call per routed model: status, latency, tokens, cost |
| `npm run fn:build` | Bundle Edge Functions to `dist/functions/` |
| `npm run fn:deploy -- <slug>` | Build and deploy one Edge Function |
| `npm run db:new -- <name>` | Create a new migration |
| `npm run db:up` | Apply pending migrations |
| `npm run advisor` | InsForge security / performance advisor findings |

## Curriculum scope

**CBSE Class 10 Science, 2026-27:** 13 assessed chapters across Chemistry (1–4), Biology (5–8, 13)
and Physics (9–12). Periodic Classification of Elements, Evolution, and electric motors /
electromagnetic induction / generators are formative-only (not in the year-end exam).

**Andhra Pradesh SSC:** chapter mapping will be added from the official SCERT / BSE AP syllabus.

Learning material is only ingested once its usage rights are confirmed (tracked per source in the
database).

## Roadmap

1. **Foundation:** auth, schema, RLS, curriculum ✅ (in progress)
2. **Knowledge base:** textbook ingestion, embeddings, hybrid retrieval, retrieval evaluation
3. **AI tutor:** grounded English and Telugu explanations, Socratic mode, citations
4. **Assessment:** quiz generation → independent validation → deterministic verification
5. **Learning intelligence:** topic mastery, spaced repetition, recommendations
6. **Documents & voice:** OCR of notes and diagrams, Telugu speech in and out
7. **Production:** benchmarks, security review, consent workflow review, pilot study

Learning-outcome claims will come only from a consented pre-test / post-test pilot, never from
assumptions.

## Privacy

Users are minors. The platform collects minimal personal data (display name, board, grade and
birth year only), needs verifiable parental consent before AI features, and isolates every
student's data at the database level. A legal review under India's DPDP Act is required before
public launch.
