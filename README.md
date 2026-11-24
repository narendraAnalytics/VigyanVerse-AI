# VigyanVerse AI

**A multilingual AI learning platform for Class 10 Science, in English and Telugu.**

**Live:** [vigyanverseai.live](https://vigyanverseai.live) (fallback: [vigyanverseai.vercel.app](https://vigyanverseai.vercel.app); frontend on Vercel, backend on InsForge; real (live) Razorpay payments since 2026-11-23)

VigyanVerse AI helps Class 10 students understand Physics, Chemistry and Biology, not just memorise
answers. It combines a textbook-grounded AI tutor, Socratic questioning, quizzes with verified
answer keys, mistake classification, per-chapter mastery tracking, document reading and voice. It
is built for CBSE and Andhra Pradesh SSC students.

> **Core philosophy:** Teach concepts. Identify gaps. Adapt learning. Measure improvement.

---

## Status

**In production.** The backend runs on InsForge and the frontend (Next.js, in `frontend/`) on Vercel at
[https://vigyanverseai.live](https://vigyanverseai.live). Students pay per AI task from a rupee
credits wallet topped up through Razorpay, with real (live) payments since 2026-11-23. The owner tested every
logged-in flow on the live site on 2026-11-17 (top-up, tutor, quiz, photo questions, voice). The student-facing app is English only
for now; Telugu support stays in the backend and returns later.

| Area | State |
|---|---|
| InsForge backend project (Nano compute) | ✅ Deployed: 30 migrations, 9 Edge Functions |
| Knowledge base (13 NCERT chapters, 360 chunks, keyword search) | ✅ Recall@5 100%, Recall@1 87%, MRR 0.93 |
| Tutor, Socratic mode, maths reasoning (LangGraph.js) | ✅ Live-evaluated |
| Quizzes: generate → validate → grade → mistake feedback | ✅ Live-evaluated |
| Learning intelligence: mastery, spaced revision, next activity, advice | ✅ Live-evaluated |
| Document reading (Gemma 4) and questions about an upload | ✅ Live-evaluated |
| Voice: Telugu / English speech in (Saaras v4) and out (Bulbul v4 Flash) | ✅ Round trip checked |
| Identity, roles, RLS; parent linking and consent tables | ✅ Applied and security-checked. Students now use their own account: `has_consent()` is true for a student's own account (migration 20) |
| Frontend: 3D open-textbook site (Home, Physics, Chemistry, Biology, AI Tutor, My Learning, Wallet, sign-in, bookplate) | ✅ Deployed on Vercel: [vigyanverseai.live](https://vigyanverseai.live) |
| Credits wallet + Razorpay top-ups (₹1 = 1 credit, pay per AI task, refunds on failure) | ✅ Built and security-checked; live since 2026-11-23 |
| Logged-in end-to-end tests on the live site (top-up, tutor, quiz, photo upload, voice) | ✅ Passed, owner tested from a fresh account 2026-11-17 |
| Credit checks before every paid action (locks, low-credit notes, top-up prompt) | ✅ Tested live 2026-11-17 |
| Policy pages (About, Contact, Pricing, Terms, Privacy, Refunds) | ✅ Live on vigyanverseai.live (2026-11-21) |
| Razorpay live mode | ✅ Live since 2026-11-23 (new Razorpay account for vigyanverseai.live, live keys + live webhook, a real ₹10 top-up credited once). The DPDP review is still advised before a public launch |
| Videos: home intro (2:10), Physics / Chemistry / Biology / sign-in explainers, LinkedIn demo (2:11) | ✅ Made with Remotion in `remotionvideos/`; site videos on InsForge Storage (CDN), the demo kept local |
| AP SSC curriculum, Telugu chapter titles | ⏳ Waiting for official sources |
| NCERT usage permission | ⏳ Launch blocker |

Full details are in `backenddescription.txt` (agents, workflows, database, security), kept on the
owner's machine and not in this repository.

## Key ideas

- **LLMs write, code decides.** Models explain, reword and read images. Deterministic code owns
  scoring, marks, mastery, revision dates, calculations, equation balancing, citations, consent and
  limits. A model can never change a grade, a mastery state or a citation.
- **Grounded, not guessed.** Answers come from retrieved NCERT passages. Citations come from stored
  chunk metadata, never from model text. A question outside the textbook gets a short 1–2 sentence answer
  with no textbook citation.
- **Simple and short.** Every agent answers in plain Class 10 language; detail only on request.
- **No web search.** Answers come from the textbook and the student's own uploads.
- **Private by design.** Every table has row-level security, so a student only sees their own chats,
  notes and progress. Uploaded photos are visible only to the student. Answer keys are unreadable to
  clients. Audio is never stored. (Parent linking and consent records still exist in the database but
  are not required: owner decision 2026-11-15, one account per student.)
- **Cost-aware.** Each task uses the cheapest model that does it well, with a fallback. Cost and
  latency are logged per call in ₹, and each student has a daily cap (₹10) plus per-minute limits.
- **Pay per task, never for a failure.** Each AI task takes a small price from the student's credits
  *before* the model runs and gives it back if the AI fails. Credits are added only when Razorpay's
  verified webhook confirms the exact pack price; the browser can never add money.
- **Small and fast.** Runs on InsForge Nano; every request finishes inside the 30 s Edge Function limit.

## The agents

| Agent | Model | What it does |
|---|---|---|
| Router | Sarvam Prism (decision model, ~0.15 s), DeepSeek V4.1 Flash as backup | Decides the intent (concept, numerical, quiz, follow-up, greeting, off-topic, unsafe), subject and language |
| Curriculum Retrieval | none (code) | Keyword + IDF search (stop words and plain numbers skipped; a spoken percentage such as "ten percent" becomes "10", as the book prints it); rates the result grounded / weak / none; builds citations |
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

Paid functions (`tutor-chat`, `quiz-generate`, `document-process`, `document-ask`, `voice-transcribe`,
`voice-speak`) charge the student's credits first and return the new balance.

## Credits and payments

1 credit = ₹1, stored in paise. No free credits. Prices and packs live in database tables
(`task_prices`, `topup_packs`), so they change without a deploy.

| Task | Price |
|---|---|
| Tutor, Socratic or maths question | ₹0.50 |
| Question about a photo | ₹0.50 |
| Read a photo of notes | ₹1.50 |
| Speak a question | ₹0.50 |
| Hear an answer read aloud | ₹1 |
| "Bindu explains": an answer as a voiced whiteboard lesson (watch again free) | ₹3 |
| Quiz (per 5 questions, checking included) | ₹2 |
| Answer checking, progress, revision, learning advice | free |

Top-up packs: ₹10, ₹50, ₹100 (you get ₹110), ₹200 (you get ₹230).

Flow: `start_topup` (amount from the pack table) → InsForge creates the Razorpay order → Razorpay
Checkout in the app → Razorpay webhook to InsForge → a database trigger credits the wallet once per
payment, only if the paid amount equals the pack price and the payment environment is the current one
(`wallet_settings`). Students can read but never write their wallet, history or top-ups.

Sign-in is required to pay (email + password, Google or GitHub, then the bookplate): credits belong
to one student account. Razorpay keys stay in InsForge only; test and live keys are separate pairs.
Payments are live since 2026-11-23: a real ₹10 UPI top-up was credited once by the live webhook.
`wallet_settings.payment_environment` = 'live' (set it to 'test' to go back to test money). The top-up
window and the Pricing page explain safe payments: Razorpay's secure window (UPI, cards, net banking),
the app never sees card numbers, bank details or UPI PINs, and credits are added only after Razorpay confirms.

The header shows the balance as a pill (green from ₹50, amber ₹10–₹49, red "Low" under ₹10, red at
₹0); clicking it opens the top-up window, and a hand-written note on hover says roughly how many
questions it pays for.

Every paid action checks the balance **before** any AI call. When the balance is known to be short, the
control shows a lock (photo upload, question box, send, mic, Listen, Practise, quiz sizes) and a friendly
"Top up now? Yes / Not now" note appears instead of an error. The quiz setup shows the price of each size
(5 / 10 / 15 questions) and says how far the balance goes; the photo upload warns when the balance would
read the photo but leave nothing to ask about it. The server still checks and charges every call.

## Tech stack

| Layer | Technology |
|---|---|
| Backend platform | [InsForge](https://insforge.dev): Postgres, Auth, Storage, Edge Functions (Deno), Realtime |
| Compute | InsForge Nano (2 vCPU, 0.5 GB), scaled up only on real demand |
| Database | PostgreSQL with row-level security; full-text search with IDF weighting |
| AI | [Sarvam](https://docs.sarvam.ai): Token Factory chat models, Saaras (speech-to-text), Bulbul (text-to-speech). One API key covers all |
| Agents | LangGraph.js StateGraph, TypeScript |
| Validation & verification | zod, mathjs, custom chemical equation balancer |
| Testing | vitest (343 unit tests), live per-agent evals with pass bars set before the run, rolled-back SQL checks |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, React Three Fiber, GSAP, Motion |
| Hosting | Vercel (frontend), InsForge (backend) |
| Payments | Razorpay (Orders + Checkout.js) through InsForge's built-in payments module |
| Videos | Remotion 4 (three.js style kits and flat SVG scenes), Edge TTS narration, synthesized music |

## Repository structure

```
vigyanverseai/
├── README.md
├── backenddescription.txt     detailed backend description (kept locally, not in git)
├── projectOverview.txt        product vision (kept locally; some parts outdated)
├── frontend/                  Next.js web app (see below)
├── remotionvideos/            explainer, intro and LinkedIn demo videos (Remotion; see "Videos")
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
```

The site is one illustrated textbook: each section is a two-page spread and moving between sections
turns the page. AI Tutor and My Learning appear in the navbar only after sign-in.

## Deployment

| Part | Where | Notes |
|---|---|---|
| Frontend | Vercel: [vigyanverseai.live](https://vigyanverseai.live) (custom domain from Hostinger; www and vigyanverseai.vercel.app redirect / still work) | Root directory `frontend`, framework Next.js, deployed manually |
| Backend | InsForge (`https://r2f4a6w6.ap-southeast.insforge.app`) | Migrations with `npm run db:up`, functions with `npm run fn:deploy -- <slug>` |
| Payments | Razorpay LIVE via InsForge (since 2026-11-23) | Live webhook: `https://r2f4a6w6.ap-southeast.insforge.app/api/webhooks/razorpay/live` (events `payment.captured`, `payment.failed`, `order.paid`); the test webhook ends in `/test` |

**Vercel environment variables (only these three):**

| Name | Value |
|---|---|
| `NEXT_PUBLIC_INSFORGE_URL` | the InsForge API URL |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | the InsForge anon key |
| `NEXT_PUBLIC_APP_URL` | `https://vigyanverseai.live` (used for sign-up, reset and OAuth redirects) |

Razorpay keys, the Sarvam key and the InsForge API key live only in InsForge, never in Vercel.
`NEXT_PUBLIC_` values are fixed at build time: redeploy after changing them.

**Backend settings that name the site:** the function secret `ALLOWED_ORIGIN` is a comma-separated
list (`http://localhost:3000,https://vigyanverseai.vercel.app,https://vigyanverseai.live,https://www.vigyanverseai.live`), and `backend/insforge.toml`
`allowed_redirect_urls` lists `/api/auth/callback`, `/sign-in` and `/reset-password` for both sites
(apply with `npx -y @insforge/cli config apply`). A new domain needs both updated.

## Videos

All videos are made in `remotionvideos/` with Remotion (Studio: `npm run dev`; renders run on the dev machine).
Narration is Edge TTS (Indian English voices, no API key); music and sound effects are synthesized by scripts
(no samples, no licences).

| Video | Where it plays | Notes |
|---|---|---|
| Home intro "Welcome to VigyanVerse AI" (2:10, Paper Pop-Up style) | Home page, once per device, muted autoplay with "Tap for sound" | Fills the window edge to edge in landscape; upright phones letterbox |
| Ohm's law, The Hidden Chemistry Around Us, The Science of Life | Physics, Chemistry and Biology pages (Watch tab) | Facts checked against the NCERT chapters |
| Welcome to VigyanVerse (15 s) | Sign-in page | Two students, Google / GitHub sign-in |
| LinkedIn demo (2:11, mid-century cartoon + the real site) | LinkedIn post (not on the site) | Two mothers talk while the owner's screen recording shows the tutor, photo questions, quizzes, Bindu, credits and safe payments; ends with "Work with us" and vigyanverseai.live. The recording and the rendered file stay local |

Site videos live in the public InsForge Storage bucket `explainers` (served by the CDN); they load only when played.

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
   sign-in (email + password with a 6-digit email check at sign-up, Google, GitHub), student bookplate, tutor chat (explain and hint modes), quiz,
   progress page, photo upload, voice; deployed on Vercel
8. ✅ **Credits & payments:** rupee wallet, Razorpay top-ups (test mode), pay per AI task with refunds
9. ✅ **Real-user testing:** logged-in end-to-end tests on the live site (top-up, tutor, quiz, photo, voice),
   credit checks and low-credit messages (2026-11-17)
10. ✅ **Production:** frontend on Vercel, backend on InsForge, payments wired end to end
11. ✅ **Live payments:** Razorpay live mode on vigyanverseai.live (2026-11-23)
12. ✅ **Videos:** home intro, subject and sign-in explainers, LinkedIn demo video (2026-11-24)
13. ⏳ **Public launch:** NCERT usage permission, legal review of student consent and payments by minors
    (see Privacy), native Telugu review, AP SSC chapters, pilot study

Learning-outcome claims will come only from a consented pre-test / post-test pilot, never from
assumptions.

## Privacy

Users are minors. The platform collects minimal personal data (first name, board, class and birth
year only) and isolates every student's data at the database level. Uploaded documents are visible
only to the student, and voice recordings are never stored. Payments go through Razorpay: the app never
sees card numbers or UPI PINs, and stores only the order / payment ids and the credit history.

**Open item:** since 2026-11-15 a student does not need a parent's permission to use the AI features
(owner decision). India's DPDP Act requires verifiable parental consent for under-18s, so a legal
review is required before public launch. The parent tables and the old rule can be restored with one
migration. Students now also pay for AI tasks, so the same review should cover payments by minors.
Razorpay live mode was switched on before that review (owner decision 2026-11-21, live since 2026-11-23);
the review is still advised before a public launch.
