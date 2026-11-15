# VigyanVerse AI

**A multilingual AI learning platform for Class 10 Science, in English and Telugu.**

VigyanVerse AI helps Class 10 students understand Physics, Chemistry and Biology, not just memorise
answers. It combines a textbook-grounded AI tutor, Socratic questioning, quizzes with verified
answer keys, mistake classification, per-chapter mastery tracking, document reading and voice. It
is built for CBSE and Andhra Pradesh SSC students.

> **Core philosophy:** Teach concepts. Identify gaps. Adapt learning. Measure improvement.

---

## Status

**The backend is complete and deployed on InsForge. The frontend (Next.js, in `frontend/`) is built and runs against it; logged-in testing is under way.**

| Area | State |
|---|---|
| InsForge backend project (Nano compute) | ✅ Deployed: 21 migrations, 9 Edge Functions |
| Knowledge base (13 NCERT chapters, 360 chunks, keyword search) | ✅ Recall@5 100%, MRR 0.92 |
| Tutor, Socratic mode, maths reasoning (LangGraph.js) | ✅ Live-evaluated |
| Quizzes: generate → validate → grade → mistake feedback | ✅ Live-evaluated |
| Learning intelligence: mastery, spaced revision, next activity, advice | ✅ Live-evaluated |
| Document reading (Gemma 4) and questions about an upload | ✅ Live-evaluated |
| Voice: Telugu / English speech in (Saaras v4) and out (Bulbul v4 Flash) | ✅ Round trip checked |
| Identity, roles, RLS; parent linking and consent tables | ✅ Applied and security-checked. Students now use their own account: `has_consent()` is true for a student's own account (migration 20) |
| Frontend: 3D open-textbook site (Home, Physics, Chemistry, Biology, AI Tutor, My Learning, sign-in, bookplate) | ✅ Built, pushed, production build passes |
| Logged-in end-to-end tests (tutor, quiz, upload, voice), real student photos and voices | ⏳ Started: first account and bookplate created; the rest to test |
| AP SSC curriculum, Telugu chapter titles | ⏳ Waiting for official sources |
| NCERT usage permission | ⏳ Launch blocker |

Full details: [`backenddescription.txt`](backenddescription.txt) (agents, workflows, database,
security) and [`backendplan.txt`](backendplan.txt) (decisions and work log).

## Key ideas

- **LLMs write, code decides.** Models explain, reword and read images. Deterministic code owns
  scoring, marks, mastery, revision dates, calculations, equation balancing, citations, consent and
  limits. A model can never change a grade, a mastery state or a citation.
- **Grounded, not guessed.** Answers come from retrieved NCERT passages. Citations come from stored
  chunk metadata, never from model text. A question outside the textbook gets a 1–2 sentence answer
  labelled "Not from your Class 10 textbook – not needed for the exam".
- **Simple and short.** Every agent answers in plain Class 10 language; detail only on request.
- **No web search.** Answers come from the textbook and the student's own uploads.
- **Private by design.** Every table has row-level security, so a student only sees their own chats,
  notes and progress. Uploaded photos are visible only to the student. Answer keys are unreadable to
  clients. Audio is never stored. (Parent linking and consent records still exist in the database but
  are not required: owner decision 2026-11-15, one account per student.)
- **Cost-aware.** Each task uses the cheapest model that does it well, with a fallback. Cost and
  latency are logged per call in ₹, and each student has a daily cap (₹10) plus per-minute limits.
- **Small and fast.** Runs on InsForge Nano; every request finishes inside the 30 s Edge Function limit.

## The agents

| Agent | Model | What it does |
|---|---|---|
| Router | DeepSeek V4.1 Flash | Decides the intent (concept, numerical, quiz, follow-up, greeting, off-topic, unsafe), subject and language |
| Curriculum Retrieval | none (code) | Keyword + IDF search; rates the result grounded / weak / none; builds citations |
| AI Tutor | Sarvam 105B | Short answers from the retrieved passages, English or Telugu |
| Socratic Tutor | Sarvam 105B | Hints instead of answers; code owns the turn plan and leak guards |
| Maths & Science Reasoning | DeepSeek V4.1 Flash + code | Model writes givens and an expression, code calculates and checks |
| Quiz Generation | DeepSeek V4.1 Flash | Writes MCQ and numeric questions; code gates every question |
| Assessment Validation | Sarvam 105B | Solves each question blind and quotes evidence; wrong keys are rejected |
| Mistake Classification | GLM 5.3 Flash | Names the mistake type and explains a wrong answer (code already graded it) |
| Learning Advice | GLM 5.3 Flash | Words the next-step advice that SQL chose; fixed-text fallback |
| Document Intelligence | Gemma 4 (vision) | Reads a photo of notes, a page or a diagram; code decides "needs review" |
| Document Q&A | Sarvam 105B | Answers only from the uploaded text; code writes the "not found" reply |
| Voice | Saaras v4, Bulbul v4 Flash | Speech to text and text to speech (female voices, configurable) |

## Edge Functions (the API)

| Function | Purpose |
|---|---|
| `tutor-chat` | One tutor or Socratic turn (LangGraph: router → retrieval → tutor / socratic / math) |
| `quiz-generate` | Generate and validate a practice quiz for a chapter |
| `answer-evaluate` | Grade a quiz, explain mistakes, update mastery and the revision schedule |
| `learning-advice` | What to practise next, in a sentence or two |
| `document-process` | Read an uploaded image with the vision model |
| `document-ask` | Ask a question about an uploaded document |
| `voice-transcribe` | Speech to text (Telugu / English) |
| `voice-speak` | Text to speech |
| `verify-science` | Deterministic unit conversion, calculation and equation-balance checks |

## Tech stack

| Layer | Technology |
|---|---|
| Backend platform | [InsForge](https://insforge.dev): Postgres, Auth, Storage, Edge Functions (Deno), Realtime |
| Compute | InsForge Nano (2 vCPU, 0.5 GB), scaled up only on real demand |
| Database | PostgreSQL with row-level security; full-text search with IDF weighting |
| AI | [Sarvam](https://docs.sarvam.ai): Token Factory chat models, Saaras (speech-to-text), Bulbul (text-to-speech). One API key covers all |
| Agents | LangGraph.js StateGraph, TypeScript |
| Validation & verification | zod, mathjs, custom chemical equation balancer |
| Testing | vitest (251 unit tests), live per-agent evals with pass bars set before the run, rolled-back SQL checks |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, React Three Fiber, GSAP, Motion |

## Repository structure

```
vigyanverseai/
├── README.md
├── backenddescription.txt     detailed backend description (agents, workflows, database)
├── backendplan.txt            backend decisions and work log
├── projectOverview.txt        product vision (some parts outdated; backendplan.txt wins)
├── frontend/                  Next.js web app (see below)
└── backend/
    ├── migrations/            SQL migrations (schema, RLS, seed data)
    ├── src/
    │   ├── agents/            the agents, the LangGraph turn, the agent kit
    │   ├── functions/         Edge Functions, one folder per endpoint
    │   ├── shared/            env, HTTP/auth, model registry, LLM + speech clients, retrieval
    │   └── verify/            deterministic numeric + chemistry verification
    ├── scripts/               bundler/deployer, ingestion, live evals, SQL checks
    ├── data/eval/             eval datasets, fixtures and saved results
    └── tests/                 unit tests
```

## Getting started (backend)

Prerequisites: Node.js 22+, an InsForge account, and a Sarvam API key.

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

Optional secrets `TTS_SPEAKER_EN` and `TTS_SPEAKER_TE` change the spoken voice without a code change.

### Common commands

| Command | Purpose |
|---|---|
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (no AI tokens) |
| `npm run eval:agent -- <agent>` | Small live check of one agent (router, retrieval, tutor, socratic, math, turn, quiz, validator, quizflow, mistake, advice, document, docqa) |
| `npm run fn:deploy -- <slug>` | Build and deploy one Edge Function |
| `npm run db:new -- <name>` | Create a new migration |
| `npm run db:up` | Apply pending migrations |
| `npm run advisor` | InsForge security / performance advisor findings |

## Running the frontend

A step-by-step guide is in [`frontend/README.md`](frontend/README.md) (kept local). In short:

```bash
cd frontend
npm install
# create .env.local: NEXT_PUBLIC_INSFORGE_URL, NEXT_PUBLIC_INSFORGE_ANON_KEY, NEXT_PUBLIC_APP_URL
npm run dev          # http://localhost:3000
```n
The site is one illustrated textbook: each section is a two-page spread and moving between sections
turns the page. AI Tutor and My Learning appear in the navbar only after sign-in.

## Curriculum scope

**CBSE Class 10 Science, 2026-27:** 13 assessed chapters across Chemistry (1–4), Biology (5–8, 13)
and Physics (9–12). Periodic Classification of Elements, Evolution, and electric motors /
electromagnetic induction / generators are formative-only (no year-end-style quizzes on them).

**Andhra Pradesh SSC:** chapter mapping will be added from the official SCERT / BSE AP syllabus,
never from machine translation or unofficial lists.

Learning material is only ingested once its usage rights are confirmed (tracked per source in the
database). Mastery is tracked per chapter for now; topic-level tracking needs an official topic list.

## Roadmap

1. ✅ **Foundation:** auth, schema, RLS, curriculum
2. ✅ **Knowledge base:** NCERT ingestion and keyword retrieval with evaluation
3. ✅ **AI tutor:** grounded English and Telugu answers, Socratic mode, maths, citations
4. ✅ **Assessment:** quiz generation → independent validation → code grading → mistake feedback
5. ✅ **Learning intelligence:** per-chapter mastery, spaced repetition, next activity, advice
6. ✅ **Documents & voice:** reading uploaded images, Telugu / English speech in and out
7. ✅ **Frontend:** full-screen 3D open-textbook site with page-turn navigation, landing page, sign-up and
   sign-in (email code, Google, GitHub), student bookplate, tutor chat (explain and hint modes), quiz,
   progress page, photo upload, voice
8. ⏳ **Real-user testing:** logged-in end-to-end tests, real handwriting photos and voices, Telugu review
9. ⏳ **Production:** benchmarks, security review, legal review of student consent (see Privacy), pilot study

Learning-outcome claims will come only from a consented pre-test / post-test pilot, never from
assumptions.

## Privacy

Users are minors. The platform collects minimal personal data (first name, board, class and birth
year only) and isolates every student's data at the database level. Uploaded documents are visible
only to the student, and voice recordings are never stored.

**Open item:** since 2026-11-15 a student does not need a parent's permission to use the AI features
(owner decision). India's DPDP Act requires verifiable parental consent for under-18s, so a legal
review is required before public launch. The parent tables and the old rule can be restored with one
migration.
