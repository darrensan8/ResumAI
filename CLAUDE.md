# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ResumAI is a full-stack resume analyzer. Users upload a PDF resume and paste a job
description; the backend extracts text, sends it to the Claude API, and returns a large
structured JSON analysis (9 scored dimensions, keyword/tech-stack/impact analysis,
prioritized improvement suggestions, hiring recommendation). Login is optional — state is
keyed by an anonymous session ID, and logged-in users also get a saved feedback history.

- **Backend:** FastAPI + SQLAlchemy + PostgreSQL (Supabase), deployed on Railway.
- **Frontend:** React 19 + TypeScript + Vite, deployed on Vercel.
- **Live:** frontend https://resum-ai-alpha.vercel.app · API https://resumai-production-c766.up.railway.app/docs

## Commands

Backend (run from `backend/`, venv activated):
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload        # http://localhost:8000  (docs at /docs)
```
Requires a `backend/.env` with `DATABASE_URL` (Supabase connection string),
`ANTHROPIC_API_KEY`, and `JWT_SECRET` (any long random string; signs login tokens). There is no test suite.

Frontend (run from `frontend/`):
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build  — use this to typecheck
npm run lint       # eslint
```

## Architecture & conventions

**Session model.** Identity starts anonymous (login is optional; see Auth). On the first resume upload the backend mints a
`uuid4` session ID, persists it as the primary key on every table, and sets it as a
`session_id` cookie. The frontend *also* stores it in `localStorage` and replays it on
later requests via the `X-Session-Id` header. Backend routes therefore resolve identity as
`effective_session_id = session_id (cookie) or x_session_id (header)` — keep this pattern
when adding routes. Every table is keyed by `session_id`, so a new upload **overwrites**
the prior resume/job-description/analysis for that session (upsert, not append).

**Auth (optional).** `app/services/auth.py` + `app/routes/auth.py` (`/api/auth/signup`,
`/login`, `/me`): bcrypt password hashes, HS256 JWT (30 days) returned in the body and sent
by the frontend as `Authorization: Bearer` (stored in `localStorage.auth_token`; use
`authHeaders()` from `frontend/src/lib/auth.ts`, which also adds `X-Session-ID`). Use
`get_current_user` / `get_optional_user` dependencies. Password rules live in both
`PASSWORD_RULES` (backend) and `frontend/src/lib/password.ts` — keep them in sync. Every
finished analysis also appends an `AnalysisHistory` row (with the JD text copied in);
anonymous rows are attached to the account on signup/login (`claim_session`).
`/api/history/` lists the user's runs and `/api/history/{id}` returns one. No email
verification, password reset, or login rate limiting yet.

**Request flow.** `POST /api/resume/upload-resume` (PDF → text via pdfplumber, min 50 words)
→ `POST /api/job-description/upload-job-description` (text, min 50 words, requires an
existing resume) → `POST /api/analysis/analyze-stream` (requires both; calls Claude and
streams server-sent events: one `section` event per finished top-level field, then `done` or
`error`; the frontend uses this). `POST /api/analysis/analyze` returns the same analysis as
one JSON response. After an analysis, `POST /api/chat/message` (`{messages: [{role, content}]}`,
max 30 alternating messages ending on `user`, ≤4000 chars each) streams a follow-up answer as
`delta` SSE events, then `done`/`error`. Chat is **ephemeral**: the frontend's `ChatPanel`
holds the conversation and resends it every turn; nothing is stored. `services/chat.py`
reuses the analysis client and `MODEL` (effort low), and puts the resume, JD and saved
`AnalysisScores` in a cached system prompt. Resume PDF
bytes can be re-fetched via `GET /api/get-resume/get-resume`. Routers are registered in
`backend/main.py`; each lives in `backend/app/routes/` and is mounted under `/api/<name>`.

**The analysis core** is `backend/app/services/analysis.py`. It holds one giant prompt
(which includes today's date, so models don't flag recent experience as "future-dated")
and calls `MODEL`/`EFFORT` (`claude-sonnet-5`, medium) with structured outputs:
`ANALYSIS_SCHEMA` guarantees valid JSON, and its property order is the order sections
stream in, so keep it matching the card order in `AnalysisView.tsx`. Refusals and `max_tokens`
cut-offs raise `ValueError`. **The prompt's JSON example, `ANALYSIS_SCHEMA`, the SQLAlchemy
models, and the frontend's `AnalysisView.tsx` rendering are tightly coupled** — changing a
field means updating all of them. `backend/scripts/benchmark_models.py` compares models on
this exact request (speed, cost, JSON validity); it makes real, billed API calls. When touching Claude/model code, consult the
`claude-api` skill for current model IDs and API usage rather than guessing.

**Persistence.** Models in `backend/app/models/__init__.py`: `Resume` (stores both
extracted `resume_text` and raw PDF `resume_data` BLOB), `JobDescription`, `AnalysisScores`
(`analysis_data` JSON), `ResumeFeedback` (improvements JSON), `Analytics`, `User`, and
`AnalysisHistory` (append-only, one row per analysis). Tables are
auto-created at startup via `Base.metadata.create_all` — there are no migrations, so a model
change requires manually altering the live DB.

**Frontend.** Three pages (`UploadResume` → `UploadJobDescription` → `Analysis`) plus
`History` / `HistoryDetail` (`/history`, `/history/:id`), wired with react-router in
`main.tsx` under `AuthProvider` (which also owns the login modal and the one-time
first-visit welcome prompt). `PageShell` renders the top-right `AccountButton` on every
page. Result cards live in `components/AnalysisView.tsx`, shared by `Analysis` and
`HistoryDetail`. `Analysis` also mounts `components/ChatPanel.tsx`, a right-hand sheet
(full screen on phones) opened from the rail's "Ask about this review" button; it only sends
once the stream is done. SSE parsing is shared via `lib/sse.ts` (`readSSE`). `App.tsx` is a
placeholder. The API base URL lives in `src/lib/api.ts` and
defaults to the Railway production URL, so `npm run dev` hits prod unless you run it with
`VITE_API_URL=http://localhost:8000`.

**CORS** allow-list is hardcoded in `backend/main.py`; add new frontend origins there.

## Gotchas

- `backend/app/services/storage.py` (filesystem PDF storage) and `cleanup.py` are **not
  wired in** — the live path stores PDF bytes directly in the DB via the `Resume` model.
  Don't assume they run.
- Cookies are set with `samesite="none"; secure=True`, which only work over HTTPS — another
  reason cookie auth won't function on plain-HTTP localhost and the header fallback is used.
- The root `package.json` is vestigial; the real frontend is in `frontend/`.
