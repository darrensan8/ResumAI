# ResumAI

An AI-powered full-stack resume analyzer that evaluates resumes against job descriptions using Claude, returning structured feedback across 9 scoring dimensions.

**Live App:** https://resum-ai-alpha.vercel.app  
**Live API:** https://resumai-production-c766.up.railway.app/docs

---

## What it does

Upload your resume and paste a job description — ResumAI uses Claude to analyze your resume across:

- Experience relevance & company tier signal
- Technical skills & stack alignment
- Impact and metrics quality
- System design signals
- CS fundamentals visibility
- Project quality
- ATS compatibility
- Role level fit
- Structure and readability

Returns a hiring recommendation, keyword gap analysis, tech stack breakdown, and actionable improvement suggestions with example rewrites.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite |
| Backend | FastAPI (Python) |
| AI | Anthropic Claude API |
| Database | PostgreSQL (Supabase) |
| PDF Parsing | pdfplumber, pytesseract |
| Deployment | Railway (backend), Vercel (frontend) |
| CI/CD | GitHub → Railway + Vercel auto-deploy |

---

## Architecture
POST /api/resume/upload-resume                    # Upload PDF resume
POST /api/job-description/upload-job-description  # Paste job description
POST /api/analysis/analyze                        # Run Claude analysis
GET  /api/get-resume/get-resume                   # Retrieve stored resume


Session-based state via HTTP cookies and localStorage — no login required. Analysis results cached in PostgreSQL to avoid redundant API calls.

---

## Local Setup

``` bash
git clone https://github.com/darrensan8/resumai
cd resumai/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder:

DATABASE_URL=your-supabase-connection-string
ANTHROPIC_API_KEY=your-anthropic-key

Run the backend:

```bash
uvicorn main:app --reload
```

Run the frontend:

```bash
cd ../frontend
npm install
npm run dev
```

Backend API docs available at `http://localhost:8000/docs`  
Frontend available at `http://localhost:5173`

