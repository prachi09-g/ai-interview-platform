# AI Interview Preparation & Evaluation Platform

An AI-powered platform for practicing technical, HR, behavioral, and coding interviews —
with automated speech analysis, NLP-based answer evaluation, resume ATS scoring, and
performance analytics — built as a Final Year Major Project.

> **Status:** All 14 phases complete. See [Project Phases](#project-phases) below.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Backend](#running-the-backend)
- [Running the Frontend](#running-the-frontend)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Docker Setup](#docker-setup)
- [Deployment](#deployment)
- [Project Phases](#project-phases)
- [Future Scope](#future-scope)

## Features

See `docs/PHASE-1-Architecture-and-Design.md` for the full Software Requirements
Specification. Summary:

- AI-generated mock interviews across 6 domains (Software Dev, Data Science, AI/ML,
  Cloud, Cybersecurity, HR) with Technical / HR / Behavioral / Coding / Voice modes
- Whisper-based speech-to-text with pronunciation, fluency, confidence, filler-word,
  and speaking-speed analysis
- NLP answer evaluation: grammar correction, keyword matching, semantic similarity,
  sentiment analysis
- Resume upload, parsing, ATS scoring, missing-skill detection, AI improvement suggestions
- In-browser coding assessments with automated test-case evaluation
- Progress analytics, achievements, certificates, and leaderboards
- Full admin console for content and platform management

## Technology Stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, React Hook Form, Zod, TanStack Query, Zustand |
| Backend | NestJS, TypeScript, REST, Swagger/OpenAPI |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT (access + rotating refresh), Google OAuth 2.0, OTP email verification |
| AI/NLP | OpenAI/Gemini, Whisper, Hugging Face Transformers, Sentence-Transformers |
| Queue | BullMQ + Redis |
| Testing | Jest, Playwright |
| Deployment | Docker, Docker Compose, Railway (backend+DB), Vercel (frontend) |

## Project Structure

```
ai-interview-platform/
├── frontend/        # Next.js 15 application (scaffolded in Phase 5)
├── backend/         # NestJS API (initialized in Phase 2)
├── prisma/          # Prisma schema & migrations (models added in Phase 3)
├── docker/          # Dockerfiles & docker-compose (Phase 14)
├── docs/            # Architecture docs, ER diagrams, API reference
└── README.md
```

Full annotated structure: `docs/PHASE-1-Architecture-and-Design.md` § 6.

## Installation

**Prerequisites:** Node.js ≥ 20, PostgreSQL ≥ 15, Redis ≥ 7, npm ≥ 10.

This is an **npm workspaces monorepo** — install once from the project root, not
inside `backend/`. This also ensures `prisma/seed.ts` (which lives at the repo
root, alongside `prisma/schema.prisma`) can resolve `@prisma/client` from the
hoisted root `node_modules`.

```bash
git clone <repository-url>
cd ai-interview-platform
npm install                       # installs and hoists deps for all workspaces
cp backend/.env.example backend/.env
# edit backend/.env with your DATABASE_URL, JWT secrets, Redis, AI API keys, etc.
```

## Environment Variables

All variables are documented in `backend/.env.example`, grouped by the phase that
consumes them (application, database, Redis, auth, email, storage, AI providers,
code-execution sandbox, rate limiting). At minimum for Phase 2 you need:

```
DATABASE_URL=postgresql://user:password@localhost:5432/ai_interview_platform
JWT_ACCESS_SECRET=<32+ char random string>
JWT_REFRESH_SECRET=<32+ char random string>
REDIS_HOST=localhost
REDIS_PORT=6379
```

`env.validation.ts` (Joi) validates these at boot and fails fast with a clear error
if anything required is missing.

## Database Setup

`prisma/schema.prisma` (project root) defines the full 24-table data model — the
22 tables from the Phase 1 ER diagram plus two justified additions:
`CodingSubmission` (Phase 3, backs the coding-assessment submission history)
and `ResumeTemplate` (Phase 8, backs admin-curated downloadable templates).
Table *count* is unchanged since Phase 8, but Phase 10 corrected
`SpeechAnalysis.pronunciationScore`/`pauseCount` from non-nullable to
nullable — see the Speech Analysis section below for why.

Run all commands from the **project root** (they proxy into the `backend` workspace,
which is where `@prisma/client` is generated to and consumed from):

```bash
npm run prisma:generate    # generate the Prisma Client into backend/node_modules
npm run prisma:migrate     # create and apply a migration (prompts for a name, e.g. "init")
npm run prisma:seed        # seed roles, 6 interview categories, a skills taxonomy,
                            # platform settings, and a default admin account
npm run prisma:studio      # open Prisma Studio to browse data visually
```

Default seeded admin login: `admin@aiinterview.dev` / `ChangeMe123!` — change
this immediately once Phase 4 (Authentication) is in place.

> **Note:** these commands require a reachable PostgreSQL instance at `DATABASE_URL`.
> They cannot be executed inside this sandbox (no network/DB access here), so run
> them in your own environment after `npm install`.

## Running the Backend

```bash
cd backend
npm run start:dev
```

- API base URL: `http://localhost:4000/api/v1`
- Swagger docs: `http://localhost:4000/api/docs`
- Health check: `http://localhost:4000/api/v1/health`
- Every domain module exposes a `GET /<module>/status` endpoint confirming it's
  wired into the app (e.g. `/api/v1/resume/status`) until its full logic lands
  in its dedicated phase.

### Authentication (Phase 4)

All routes require a valid JWT access token (`Authorization: Bearer <token>`)
by default — routes are opt-out via `@Public()`, not opt-in. Auth flow:

1. `POST /auth/register` — creates a STUDENT account, emails a 6-digit OTP
2. `POST /auth/verify-otp` — activates the account
3. `POST /auth/login` — returns `{ user, accessToken }`; sets an httpOnly
   `refreshToken` cookie scoped to `/api/v1/auth`
4. `POST /auth/refresh` — rotates the refresh token (reads/writes the cookie),
   returns a new `accessToken`
5. `POST /auth/logout` — revokes the current refresh token
6. `POST /auth/google` — exchanges a Google authorization code for a session
7. `POST /auth/forgot-password` → `POST /auth/reset-password` — OTP-based
   password reset; revokes all existing sessions on success

Without `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` configured in `.env`, OTP
emails are logged to the console instead of sent — convenient for local
development without a real mailbox.

## Running the Frontend

```bash
cd frontend
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL defaults to http://localhost:4000/api/v1 — matches
# the backend's default PORT/API_PREFIX from Phase 2.
npm run dev
```

Or from the project root: `npm run dev:frontend`.

- App: `http://localhost:3000`
- `/` redirects to `/login` or `/dashboard` (`/admin/dashboard` for admins)
  once the auth store has hydrated
- `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password`
  are fully wired to the Phase 4 backend endpoints
- `/dashboard` (student) and `/admin/dashboard` (admin) are protected by
  client-side `AuthGuard`/`RoleGuard` and fetch the authenticated
  `/users/me` endpoint to prove the token-attach + refresh-on-401 flow
  works end to end

**Why route protection is client-side, not Next.js middleware:** the
backend (`:4000`) and frontend (`:3000`) are different origins, and the
refresh token is an httpOnly cookie scoped to the backend's own domain —
middleware running on the frontend origin cannot read it. Instead,
`useAuthBootstrap()` (in `app/providers.tsx`) silently calls
`POST /auth/refresh` on load to exchange that cookie for an access token;
`AuthGuard`/`RoleGuard` just wait for that to settle before redirecting.

**Design system:** ink-navy/paper/signal-amber/focus-teal palette, Space
Grotesk (display) + Inter (body) + IBM Plex Mono (scores/data), with a
waveform-pulse signature motif on the auth screen — see the design plan at
the top of the Phase 5 build for the reasoning.

### Student Dashboard (Phase 6)

- `/dashboard` — live stats (interview count, badges earned, unread notifications), recent-badges and notifications previews
- `/profile` — edit personal details, skills (tag input), and account deactivation, backed by `PATCH /users/me/profile`
- `/history` — paginated interview history with bookmark toggling (empty until Phase 9 populates real sessions)
- `/achievements` — badge grid (earned vs. locked) plus a certificates section
- `/leaderboard` — top-50 table with domain/period filters and the current user's own rank
- `/notifications` — inbox with unread filter and mark-as-read; a real welcome notification and the `EARLY_ADOPTER` badge are sent on registration, proving the pipeline end-to-end

Backend additions: `NotificationsModule`, `AchievementsModule` (+ a static badge catalog documenting which future phase awards each badge), `CertificatesModule` (read/download only — generation is Phase 12), and read-only `InterviewModule` endpoints (categories, history, bookmark toggle — session creation/scoring is Phase 9).

### Admin Dashboard (Phase 7)

- `/admin/dashboard` — live platform counts (users, categories, questions, coding questions, interviews run, open feedback)
- `/admin/users` — search, paginate, activate/deactivate, override email verification
- `/admin/categories` — CRUD for the 6 interview domains
- `/admin/questions` — CRUD for the interview question bank (search, category/type/difficulty tagging, keyword tags)
- `/admin/coding-questions` — CRUD with dynamic test-case rows and a language tag input
- `/admin/skills` — manage the shared skills taxonomy used for resume ATS matching and profile tagging
- `/admin/feedback` — review and triage student-submitted feedback (Open → In Review → Resolved)
- `/admin/logs` — recent request activity (in-memory, resets on restart — see the note in `system-logs.service.ts` on why there's no persisted Logs table)

Backend additions: a full `AdminModule` (one controller/service pair per resource, all gated by `@Roles(RoleName.ADMIN)`), a small student-facing `FeedbackModule` (so the admin feedback screen has real data to manage, the same pattern Phase 6 used for notifications), `POST /admin/notifications/broadcast`, and a global `LoggingModule` (`SystemLogsService`) that the request-logging interceptor feeds — kept out of `admin/` deliberately so shared infrastructure doesn't depend on a feature module.

"Resume Templates" (from the original admin feature list) was deferred here from Phase 7 — there was no `ResumeTemplate` table until this phase introduced one. Now closed: see the Resume Analyzer section below.

### Resume Analyzer (Phase 8)

- `POST /resume/upload` — PDF upload (max 5MB), stored via `StorageService` (S3-compatible if configured, local disk fallback otherwise)
- `POST /resume/:id/analyze` — runs the full pipeline: `pdf-parse` text extraction → deterministic section/contact detection → skill-taxonomy matching → a **deterministic** ATS score (formatting/structure/keyword sub-scores — explained in `ats-scorer.service.ts` why this stays rule-based rather than AI-judged) → AI-generated missing-skills + suggestions (real OpenAI JSON-mode call, with a heuristic no-API-key fallback so the feature works without credentials configured)
- `GET /resume/:id/analysis`, `GET /resume/:id/ats-report`, `DELETE /resume/:id`
- `GET /resume/templates` + full admin CRUD at `/admin/resume-templates` (the `ResumeTemplate` model this phase adds — 24 tables total now)
- `/resume` (student) — upload, live ATS score ring with animated section bars, missing-skills/suggestions, browsable templates
- `/admin/resume-templates` — upload/manage downloadable templates

Uploading awards the `RESUME_UPLOADED` badge; scoring 80+ on an ATS report awards `HIGH_ATS_SCORE` — both real notification + achievement integrations, not stubs.

### AI Interview Module (Phase 9)

- `POST /interviews` — starts a session for TECHNICAL/HR/BEHAVIORAL types only (CODING routes through Phase 11's Coding Assessment; VOICE needs Phase 10's transcription pipeline first — accepting those now and quietly treating them as text interviews would be misleading)
- **Question sourcing**: pulls unused questions from the admin-curated bank first (excluding ones the student has already seen in that category+type), tops up any shortfall via AI generation — and **persists the generated ones back into the bank**, so it grows richer over time instead of regenerating similar questions every session
- **Answer evaluation runs asynchronously**, exactly matching the sequence diagram in the Phase 1 architecture doc: `POST /interviews/:id/responses` saves the transcript and enqueues a job on the `INTERVIEW_EVALUATION` queue (scaffolded back in Phase 2); `GET /interviews/:id/responses/:responseId` is polled until scored. A weighted blend of **deterministic keyword matching** (real word-boundary matching against the question's keyword list — no AI needed) and **AI-judged semantic similarity/grammar/sentiment** (with a heuristic fallback when no API key is configured)
- `POST /interviews/:id/complete` computes the overall score, updates `Progress`, re-ranks the `ALL_TIME` leaderboard for that category (WEEKLY/MONTHLY windowed ranking is Phase 12's job), sends a notification, and awards `FIRST_INTERVIEW`/`FIVE_INTERVIEWS`/`PERFECT_INTERVIEW`
- `/interview/setup` → `/interview/session/[id]` → `/interview/result/[id]` — the full student-facing flow, including live polling with a waveform "Evaluating your answer…" state and an expandable per-question score breakdown

### Speech Analysis (Phase 10)

**Design note:** voice isn't a separate interview *type* — it's an answer *modality*. A student picks a TECHNICAL/HR/BEHAVIORAL session as usual (Phase 9) and can answer any question by either typing or recording; both paths write to the same `InterviewResponse` row and go through the same evaluator. This closes the loose end Phase 9 explicitly left open (`InterviewType.VOICE` still isn't accepted by `POST /interviews` — it was never meant to be a session-level choice).

- `POST /speech/transcribe` — multipart audio upload (25MB max, matching Whisper's own limit). Real OpenAI Whisper integration (`response_format=verbose_json`, so segment timestamps and `avg_logprob` are genuinely usable for pause detection and a pronunciation-clarity signal — not fabricated). If the frontend already has a transcript (browser Web Speech API), Whisper is skipped entirely.
- Queued (`SPEECH_ANALYSIS_QUEUE`, scaffolded in Phase 2): the controller returns immediately after upload; the processor transcribes, computes metrics, persists, then **hands the transcript to the same `INTERVIEW_EVALUATION` queue Phase 9 uses** — voice and typed answers get identical content scoring.
- `pronunciationScore` and `pauseCount` are **nullable** in the schema (a Phase 10 correction — see below) and come back `null` when transcription used a client-provided transcript instead of Whisper: both metrics only exist because Whisper's segment data enables them, and storing a guessed number would misrepresent something never actually measured.
- `GET /speech/analysis/:responseId` — polled by the session page the same way response evaluation is polled.
- Session page: a Type/Record toggle per question using the browser `MediaRecorder` API; the result page and per-answer feedback show fluency/confidence/pronunciation/pace/filler-word metrics when available.

### Coding Assessment (Phase 11)

- Real [Judge0](https://judge0.com) integration (`JUDGE_API_URL`/`JUDGE_API_KEY`, scaffolded in Phase 2) — batch-submits every test case, polls until every submission leaves the queued/processing states, and reads Judge0's own pass/fail verdict (`status.id === 3` "Accepted") rather than re-implementing output comparison.
- **Deliberate security boundary, not a convenience choice:** student-submitted code is never executed inside this backend process (no `eval`, no `child_process`, no local sandboxing) — it only ever runs inside Judge0's isolated containers. Without `JUDGE_API_URL` configured, code execution is unavailable; there's no "heuristic fallback" for safely running arbitrary code, unlike the AI-judged features elsewhere in this codebase.
- Queued (`CODING_EXECUTION_QUEUE`) for the same reason Judge0's own docs give: they explicitly discourage synchronous `wait=true` "because it does not scale well."
- `GET /coding/questions/:id` only ever returns **one** test case (a worked example) plus a hidden-count — the rest exist purely for grading and are never shipped to the browser.
- Passing all test cases awards `CODING_FIRST_SOLVE` (seeded in Phase 6's badge catalog, which anticipated this exact integration) and a real notification either way.
- `/coding` (filterable question list) → `/coding/[id]` (description, worked example, language-aware starter snippets, a lightweight code editor, live judged-result polling, submission history).

### Analytics Dashboard (Phase 12)

- `GET /analytics/progress` (student) — cross-category score trends (reading the `Progress.trend` array Phase 9 has been appending to on every interview completion), resume ATS trend, coding pass rate, achievement count.
- `GET /analytics/overview` / `GET /analytics/domain/:categoryId` (admin) — platform KPIs, 14-day signup chart, domain popularity, and a per-domain deep-dive (most-missed keywords aggregated from real `InterviewResponse.evaluationBreakdown` data, per-question coding pass rates, top performers).
- **Closes two loose ends deliberately left open by earlier phases:** Phase 9 kept the `ALL_TIME` leaderboard live on every interview completion but explicitly deferred `WEEKLY`/`MONTHLY` recomputation here, since "the last 7 days" changes on its own as time passes rather than on any single event — this phase adds the date-windowed `groupBy` query for both. It also honors the `LEADERBOARD_REFRESH_CRON` **Setting row seeded all the way back in Phase 3** (`'0 * * * *'`) — a dynamic `SchedulerRegistry` cron job (not the static `@Cron()` decorator) reads it at boot so the schedule is admin-configurable through the `Settings` table rather than hardcoded, falling back to hourly if the value is missing or invalid.
- `/analytics` (student) and `/admin/analytics` — recharts line/bar charts, added as a new dependency this phase (verified for React 19 compatibility before pinning a version — `recharts@2.13.x` does *not* declare React 19 support, `2.15.x`+ does).


## API Documentation

Interactive Swagger UI is served at `/api/docs` in non-production environments,
generated automatically from controller decorators — see `backend/src/main.ts`.
The full static API reference (all 12 modules) is in
`docs/PHASE-1-Architecture-and-Design.md` § 7.

## Testing

### Backend (Jest)

```bash
cd backend
npm run test        # unit tests
npm run test:e2e     # e2e tests (test/app.e2e-spec.ts boots the full AppModule)
npm run test:cov     # coverage report
```

**8 unit test files**, deliberately concentrated on the codebase's actual algorithmic risk — pure/heuristic logic and business rules — rather than thin CRUD wrappers where a test would just restate the Prisma call:

| Spec | What it verifies |
|---|---|
| `common/utils/duration.util.spec.ts` | Cookie-lifetime duration string parsing |
| `interview/ai/answer-evaluator.service.spec.ts` | Keyword matching, heuristic semantic-similarity/grammar/sentiment fallback |
| `speech/ai/speech-metrics.service.spec.ts` | Filler-word counting, WPM, pause detection, Whisper `avg_logprob` → pronunciation-score mapping |
| `resume/ats-scorer.service.spec.ts` | Every formatting/structure/keyword scoring rule, against the exact point values in `ats-scorer.service.ts` |
| `coding/ai/judge0-client.service.spec.ts` | Language-ID resolution, configured-state detection |
| `auth/otp.service.spec.ts` | OTP hash-not-plaintext persistence, expiry timing, consumption |
| `auth/tokens.service.spec.ts` | Token issuance/rotation/revocation, replay rejection |
| `achievements/achievements.service.spec.ts` | Idempotent badge awarding (duplicate-award = `P2002` unique-constraint violation, not an error) |

**A real bug was found and fixed while writing these tests, not just reviewing code:** pure functions were extracted and run directly via `ts-node` (this sandbox can't `npm install`, so Jest itself can't execute here — see the caveat below) to get genuine pass/fail signal instead of relying on `tsc` type-checking alone, which cannot catch runtime logic errors. That direct execution caught a real bug in `AnswerEvaluatorService`'s keyword matcher: a `\b`-word-boundary regex silently fails to match keywords ending in non-word characters (e.g. **"C++"**), because `\b` requires a transition between a word and non-word character — when both the keyword's last character and whatever follows it are non-word (like `+` followed by a space), no such transition exists. Fixed by switching to lookaround-based boundaries (`(?<![A-Za-z0-9])...(?![A-Za-z0-9])`), verified against the original failing case plus regression cases before applying it to the real source. `SpeechMetricsService`'s filler-word counter already used the correct lookaround pattern — the same bug in a different form (missing fillers immediately followed by punctuation, e.g. `"um,"`) had already been caught there.

> **Honest caveat:** this sandbox has no network access, so `npm install` cannot run and Jest cannot execute for real here. Every spec file's *type-checking* is verified (`tsc -p tsconfig.json`, zero errors), and every numeric/behavioral claim in `ats-scorer.service.spec.ts` and `speech-metrics.service.spec.ts` was independently hand-verified against the exact formulas in their source files. The pure regex/heuristic logic itself (not the NestJS-wrapped services) was run for real via `ts-node`. Run `npm test` locally to execute the full suite.

### Frontend (Playwright)

```bash
cd frontend
npm run test:e2e
```

`playwright.config.ts` + 2 spec files (`tests/auth.spec.ts`, `tests/protected-routes.spec.ts`) covering client-side validation and `AuthGuard`/`RoleGuard` redirect behavior — chosen because these don't require a reachable backend (Zod validation and the guard redirect both run before any network call). Full register → verify → login flows need a live backend + database and aren't covered here; the backend-side equivalent is `test/app.e2e-spec.ts`. Every selector/text assertion was cross-checked against the actual page source (placeholder text, button labels, Zod error messages) rather than assumed. Not executable in this sandbox for the same reason as Jest — see `playwright.config.ts`'s own header comment.

## Docker Setup

Runs the full stack (PostgreSQL, Redis, backend, frontend) locally without
installing Postgres/Redis natively — useful for demoing the project or for
CI smoke tests. **Not** how production is deployed (see [Deployment](#deployment)
below) — this is the local/staging path.

```bash
# From the project root (build context matters — see the header comment
# in docker/backend.Dockerfile for why):
docker compose -f docker/docker-compose.yml up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000/api/v1`, Swagger at `http://localhost:4000/api/docs`
- Postgres: `localhost:5432` (user/pass `postgres`/`postgres`, db `ai_interview_platform`)
- Redis: `localhost:6379`

Secrets (`JWT_ACCESS_SECRET`, `OPENAI_API_KEY`, `JUDGE_API_URL`, ...) are read
from the shell environment or a `--env-file` — never hardcoded in
`docker-compose.yml`. Example:

```bash
docker compose -f docker/docker-compose.yml --env-file backend/.env up --build
```

The backend container runs `prisma migrate deploy` on every start (safe to
re-run — a no-op once the schema is current) before starting the API, so a
fresh `postgres` volume gets migrated automatically on first boot.

An optional single-origin nginx reverse proxy (`docker/nginx/nginx.conf`,
routing `/api` and `/uploads` to the backend, everything else to the
frontend) is available as an opt-in [Compose profile](https://docs.docker.com/compose/how-tos/profiles/)
rather than running by default, since both app containers are already
independently reachable on their own ports:

```bash
docker compose -f docker/docker-compose.yml --profile with-nginx up --build
# now available on http://localhost:80 as a single origin
```

**Two real deployment-specific bugs were found and fixed while building this
phase**, both invisible to `tsc` type-checking since they're about container
runtime behavior, not TypeScript correctness:

1. `StorageService`'s local-disk fallback resolves its upload path via
   `process.cwd()`, while `main.ts` serves static files via a `__dirname`-
   relative path. These happen to agree in local dev (`npm run start:dev`
   runs with cwd already set to `backend/`) but would silently diverge
   inside a container with `WORKDIR /app` — fixed by adding a second
   `WORKDIR /app/backend` instruction right before the final `CMD`, so the
   running process's cwd matches what both code paths assume.
2. `prisma` (the CLI, needed for `prisma migrate deploy` at container
   start) was in `devDependencies`, which the production image's
   `npm ci --omit=dev` step excludes — moved to `dependencies`, a
   legitimate choice for a project that runs migrations from its own
   production container rather than a separate CI step.

## Deployment

**Backend → [Railway](https://railway.app)** (API + managed PostgreSQL + Redis):

1. Create a new Railway project, add a **PostgreSQL** and a **Redis** plugin
2. Add a service from this repo, root directory `backend/` — or deploy
   `docker/backend.Dockerfile` directly (Railway supports building from a
   Dockerfile with a custom build context; set it to the repo root)
3. Set environment variables from `backend/.env.example` — at minimum
   `DATABASE_URL`/`REDIS_HOST`/`REDIS_PORT` (Railway injects these
   automatically when you reference the plugins), `JWT_ACCESS_SECRET`,
   `JWT_REFRESH_SECRET`, and whichever AI/storage keys you're using
4. Set the start command to `npm run prisma:deploy --workspace=backend && npm run start:prod --workspace=backend`.
   If deploying `docker/backend.Dockerfile` directly instead, set Railway's
   **Deploy Command** (overriding the image's `CMD`) to
   `npm run prisma:deploy && node dist/main.js` — the Dockerfile's `CMD`
   deliberately does *not* run migrations itself (see its own comment:
   a redeploy with no schema change shouldn't re-run them on every
   container restart the way baking it into `CMD` would)
5. Note the deployed URL — the frontend's `NEXT_PUBLIC_API_URL` needs it

**Frontend → [Vercel](https://vercel.com)**:

1. Import this repo, set the project root to `frontend/`
2. Vercel auto-detects Next.js — no build command changes needed
3. Set `NEXT_PUBLIC_API_URL` to the Railway backend's public URL
   (e.g. `https://your-app.up.railway.app/api/v1`)
4. Update the backend's `CORS_ORIGIN` to the Vercel deployment URL once
   it's live, so the browser's requests aren't blocked

## Project Phases

| # | Phase | Status |
|---|---|---|
| 1 | SRS, Architecture, ER Diagram, DB Design, Folder Structure, API Design, Wireframes | ✅ Complete |
| 2 | Backend Initialization | ✅ Complete |
| 3 | Database (Prisma schema — 22-table model + `CodingSubmission`; `ResumeTemplate` added in Phase 8) | ✅ Complete |
| 4 | Authentication Module | ✅ Complete |
| 5 | Frontend Setup | ✅ Complete |
| 6 | Student Dashboard | ✅ Complete |
| 7 | Admin Dashboard | ✅ Complete |
| 8 | Resume Analyzer | ✅ Complete |
| 9 | AI Interview Module | ✅ Complete |
| 10 | Speech Analysis | ✅ Complete |
| 11 | Coding Assessment | ✅ Complete |
| 12 | Analytics Dashboard | ✅ Complete |
| 13 | Testing | ✅ Complete |
| 14 | Docker & Deployment | ✅ Complete |

## Future Scope

- Video-based mock interviews with facial expression/eye-contact analysis
- Peer-to-peer mock interview matching
- Employer-facing candidate assessment portal
- Multi-language interview support
- Mobile app (React Native)
