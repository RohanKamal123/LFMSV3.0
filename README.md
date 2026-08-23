# Find-X

**UIU's Lost & Found Management System.** Reporting, AI-verified claiming, and QR-based handover for a university lost & found office — replacing a notice board and an honor system with an auditable pipeline.

[![CI](https://github.com/RohanKamal123/LFMSV3.0/actions/workflows/ci.yml/badge.svg)](https://github.com/RohanKamal123/LFMSV3.0/actions/workflows/ci.yml)

Two independent apps, no shared tooling: a FastAPI + SQLModel backend (`backend/`) and a React + Vite + Tailwind frontend (`frontend/`), talking over a plain JSON API.

## What it does

A student finds something and logs it, with a public description and one hidden detail only the real owner would know. The owner finds it — by browsing, by uploading a photo for AI visual matching, or via a proactive email if it's a student ID card — and has to pass a 3-question quiz generated from that hidden detail before the item ever changes hands. Recovery then happens one of two ways: directly between finder and claimant (a QR scan, no office visit), or through the Room 110 counter, where staff work a live queue instead of manually cross-referencing handoffs. Everything is logged.

For the full walkthrough of each role, see [`docs/`](docs/) — [`USER_JOURNEY.md`](docs/USER_JOURNEY.md), [`STAFF_JOURNEY.md`](docs/STAFF_JOURNEY.md), [`ADMIN_JOURNEY.md`](docs/ADMIN_JOURNEY.md) — and [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how it's built.

## Running it locally

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
API docs at `http://localhost:8000/docs`. Reset the database and load realistic demo data:
```bash
python seed_db.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
`http://localhost:5173`, pointed at the backend by default.

### Tests
```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest tests/ -v
```
Runs against a live `uvicorn` subprocess, not a mocked client — the same code path production traffic hits. Always exercises the deterministic fallback paths (see below), never a real Gemini call, so the suite is fast and doesn't burn API quota.

```bash
cd frontend
npm run lint
```

## Configuration

Everything is optional — the app runs with nothing configured and degrades feature-by-feature as keys are added.

| Variable | Effect if unset |
|---|---|
| `GEMINI_API_KEY` | Every AI feature (quiz generation, ID OCR, visual search, the admin assistant, proactive ID-owner email) falls back to a deterministic non-AI path instead of failing. |
| `DATABASE_URL` | Falls back to a local SQLite file. |
| `JWT_SECRET` | Falls back to an insecure dev default — **set this for any real deployment.** |
| `MAILERSEND_API_KEY` / `SMTP_*` | Notifications stay in-app only, no email sent. |
| `DATA_DIR` | Defaults to the working directory for the SQLite file and uploads. |

## AI, with a floor under it

Three features are AI-backed, and all three keep working — just less precisely — with no API key set:

- **Visual search** — upload a photo of a lost item; Gemini captions it and the caption is matched against found-item descriptions by embedding similarity. Falls back to a perceptual image hash.
- **Proactive ID recovery** — a found student ID gets its owner looked up and emailed directly, not just matched if they happen to file a report. Falls back to a fixed email template if Gemini is unavailable to write it.
- **Admin assistant** — a chat agent with tool access to live system data (and a couple of guarded write actions), same function-calling pattern as the automated claim-review second opinion. States plainly when no key is configured, rather than pretending.

None of these override the deterministic core (the quiz that actually gates a claim is graded by keyword match when Gemini's unavailable, not skipped).

## Project structure

```
backend/
  main.py          app + router registration
  models.py         every table, single source of truth
  api/                one router per domain
  services/            auth, AI calls, email, uploads
  migrations/            Alembic, hand-written
  tests/                   pytest suite

frontend/
  src/pages/        one page per flow
  src/components/    shared UI (QR scanner, camera upload, ticket modal)
  src/context/        auth state (no Redux)
```

## Deployment

Both halves deploy to Render — see `backend/render.yaml`. `backend/railway.json` and `frontend/vercel.json` are leftovers from an earlier target and aren't what's actually live.
