# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ResumAI is a full-stack resume analyzer. Users upload a PDF resume and paste a job
description; the backend extracts text, sends it to the Claude API, and returns a large
structured JSON analysis (9 scored dimensions, keyword/tech-stack/impact analysis,
prioritized improvement suggestions, hiring recommendation). No auth — state is keyed by
an anonymous session ID.

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
Requires a `backend/.env` with `DATABASE_URL` (Supabase connection string) and
`ANTHROPIC_API_KEY`. There is no test suite.

Frontend (run from `frontend/`):
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build  — use this to typecheck
npm run lint       # eslint
```

## Architecture & conventions

**Session model.** There is no login. On the first resume upload the backend mints a
`uuid4` session ID, persists it as the primary key on every table, and sets it as a
`session_id` cookie. The frontend *also* stores it in `localStorage` and replays it on
later requests via the `X-Session-Id` header. Backend routes therefore resolve identity as
`effective_session_id = session_id (cookie) or x_session_id (header)` — keep this pattern
when adding routes. Every table is keyed by `session_id`, so a new upload **overwrites**
the prior resume/job-description/analysis for that session (upsert, not append).

**Request flow.** `POST /api/resume/upload-resume` (PDF → text via pdfplumber, min 50 words)
→ `POST /api/job-description/upload-job-description` (text, min 50 words, requires an
existing resume) → `POST /api/analysis/analyze-stream` (requires both; calls Claude and
streams server-sent events: one `section` event per finished top-level field, then `done` or
`error`; the frontend uses this). `POST /api/analysis/analyze` returns the same analysis as
one JSON response. Resume PDF
bytes can be re-fetched via `GET /api/get-resume/get-resume`. Routers are registered in
`backend/main.py`; each lives in `backend/app/routes/` and is mounted under `/api/<name>`.

**The analysis core** is `backend/app/services/analysis.py`. It holds one giant prompt
(which includes today's date, so models don't flag recent experience as "future-dated")
and calls `MODEL`/`EFFORT` (`claude-sonnet-5`, medium) with structured outputs:
`ANALYSIS_SCHEMA` guarantees valid JSON, and its property order is the order sections
stream in, so keep it matching the card order in `Analysis.tsx`. Refusals and `max_tokens`
cut-offs raise `ValueError`. **The prompt's JSON example, `ANALYSIS_SCHEMA`, the SQLAlchemy
models, and the frontend's `Analysis.tsx` rendering are tightly coupled** — changing a
field means updating all of them. `backend/scripts/benchmark_models.py` compares models on
this exact request (speed, cost, JSON validity); it makes real, billed API calls. When touching Claude/model code, consult the
`claude-api` skill for current model IDs and API usage rather than guessing.

**Persistence.** Models in `backend/app/models/__init__.py`: `Resume` (stores both
extracted `resume_text` and raw PDF `resume_data` BLOB), `JobDescription`, `AnalysisScores`
(`analysis_data` JSON), `ResumeFeedback` (improvements JSON), `Analytics`. Tables are
auto-created at startup via `Base.metadata.create_all` — there are no migrations, so a model
change requires manually altering the live DB.

**Frontend.** Three pages (`UploadResume` → `UploadJobDescription` → `Analysis`) wired with
react-router; `App.tsx` is a placeholder. The API base URL lives in `src/lib/api.ts` and
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
