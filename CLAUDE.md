# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Find-X (LFMS V3.0) is UIU's Lost & Found Management System: a FastAPI + SQLModel (SQLite) backend and a React + Vite + Tailwind frontend, developed as two independent apps in `backend/` and `frontend/` with no shared tooling or monorepo config between them.

## Commands

### Backend (`backend/`)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload        # dev server, API docs at http://localhost:8000/docs
python seed_db.py                # reset DB and load realistic demo data (Students/Items/Locations)
```
There is no backend test suite, linter, or formatter configured — don't invent commands for these.

### Frontend (`frontend/`)
```bash
cd frontend
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build (vite build)
npm run lint      # eslint . --ext js,jsx --max-warnings 0
```
There is no frontend test suite configured.

### Environment
Backend reads `backend/.env` (via `python-dotenv`); the only variable used is `GEMINI_API_KEY`. Every AI-backed feature (quiz generation/verification, ID card OCR) has a non-AI fallback path that activates automatically when the key is unset, so the app is fully runnable without it. Frontend reads `VITE_API_URL` to override the default API base of `http://127.0.0.1:8000` (see `frontend/src/api_config.js`).

## Architecture

### Backend structure
- `main.py` — creates the FastAPI app, configures CORS, and wires up every router by hand with `app.include_router(..., prefix="/api/<domain>")`. When adding a new API module, register it here.
- `models.py` — single file containing every SQLModel table (`User`, `Item`, `LostItem`, `Claim`, `QuizLog`, `RecoveryOTP`, `Dispute`, `AuditLog`, `Category`, `Location`, `ItemImage`, `FastIDItem`, `FastIDMatch`, `CVScanResult`, `Notification`, `HandoverSession`) plus their enums. This is the single source of truth for schema.
- `database.py` — SQLite engine pointed at `database_v2.db`; `SQLModel.metadata.create_all()` runs on app startup. **There are no migrations** (no Alembic) — schema changes require dropping/recreating the DB file (or hand-rolled `ALTER TABLE`s), so be careful modifying `models.py` against the checked-in `database_v2.db`.
- `api/` — one router module per domain (`items`, `lost_items`, `claims`, `quiz`, `browse`, `fast_id`, `handover`, `handover_session`, `admin_crud`, `admin_stats`, `gatekeeper`, `upload`). Handlers talk to the DB directly via `sqlmodel.Session`/`select` with no repository/service layer for CRUD — business logic and persistence live together in the router.
- `services/` — cross-cutting logic used by routers: `gemini.py` (quiz generation + answer verification via Gemini, with keyword-overlap fallback), `id_reader.py` (Gemini Vision OCR for student ID cards, with an OpenCV contrast-enhancement retry pass), `state_triggers.py` (time-based `Item` state transitions).
- `uploads/` — image storage (found-item photos, ID card photos under `uploads/ids/`), mounted at `/uploads` via `StaticFiles`. Despite being gitignored, some existing files under here and the `database_v2.db` file are already committed to the repo — don't be surprised by git history involving them, and don't fold cleanup of them into unrelated changes.
- `seed.py`, `seed_data.py`, `seed_db.py` — three overlapping seeding scripts from different iterations of the project. **`seed_db.py` is the current/maintained one** (per `README.md`); treat the others as legacy unless told otherwise.

### No real authentication
`api/gatekeeper.py`'s `/login` is passwordless: given a `uiu_id` + role + contact, it looks up or creates a `User` row and hands back the plain user object — no password, token, or session is issued. The frontend's `AuthContext` (`frontend/src/context/AuthContext.jsx`) just stores that JSON in `localStorage` and re-validates it by re-fetching `/api/auth/me/{id}` on load. `ProtectedRoute` (`frontend/src/components/ProtectedRoute.jsx`) gates routes client-side only by comparing `user.role` against `allowedRoles`. Backend endpoints are **not** independently authorized: actor identifiers (`finder_id`, `staff_id`, `admin_id`, `claimant_id`, etc.) are accepted as plain request parameters and trusted as-is. Keep this trust model in mind — it's not an oversight to "fix" incidentally while working on unrelated features.

### Item lifecycle (state machine)
`Item.state` (`ItemState` enum) drives the core workflow:
```
ACTIVE → PENDING_HANDOVER → READY_FOR_PICKUP → RESOLVED → ARCHIVED
                ↓ (72h timeout)
        OVERDUE_SUBMISSION
```
- `ACTIVE`: item is browsable/claimable.
- A `Claim` that passes AI/quiz verification (`api/claims.py`) moves the item to `PENDING_HANDOVER`.
- Two recovery paths from there, both in `api/handover.py`:
  - **Path A (direct)**: finder scans the owner's QR (`founder-scan-claimer`) → `RESOLVED` directly.
  - **Path B (staff-mediated)**: staff intake at "Room 110" (`staff-scan-tag` / `take-by-qr`) → `READY_FOR_PICKUP`, then staff verifies pickup (`staff-scan-claimer`) → `RESOLVED`. `api/handover_session.py` layers a session-token flow on top of Path B so staff can batch-hand-over multiple approved items to one claimant via QR join.
- `services/state_triggers.py::update_stale_items()` performs the time-based transitions (`PENDING_HANDOVER` → `OVERDUE_SUBMISSION` after 72h; `RESOLVED` → `ARCHIVED` after 30 days). It's **not** a cron job — it's called lazily inside `api/browse.py`'s feed endpoint on every read.
- Every state-changing action writes an `AuditLog` row (`action_type` + `details`) for traceability.

### Claim verification (quiz)
`api/quiz.py` generates 3 challenging multiple-choice questions from an item's public/private descriptions and location via `services/gemini.generate_quiz` (Gemini, with a mock generator fallback). `api/claims.py` then judges submitted answers via `services/gemini.verify_answers` (again with a keyword-overlap fallback) and auto-approves the claim if enough answers are correct (2/3 if ≥3 questions, else all correct) — this immediately flips the `Item` to `PENDING_HANDOVER`, with no separate human-approval step in the default flow.

### Fast ID (student ID cards)
A parallel, simpler pipeline for student ID cards, separate from the main `Item`/`Claim` model: `FastIDItem` rows (type `FOUND` or `LOST`) are matched purely by ID number. Found-side entries get their ID auto-extracted from a photo via `services/id_reader.py` (Gemini Vision, retried with OpenCV contrast enhancement on failure); lost-side entries are entered manually and format-validated (9–10 digits). A match auto-fires a `FastIDMatch` plus `Notification`s to the owner and an admin whenever a `FOUND` and `LOST` entry share an ID.

### Frontend structure
- `src/App.jsx` — all routing (React Router v6). Routes are grouped by role under `ProtectedRoute` wrappers (`STUDENT`, `STAFF`/`ADMIN`, `ADMIN`-only, or any authenticated role); `Gatekeeper` is the public login/entry page.
- `src/pages/` — one page per major flow: `Gatekeeper` (login), `Dashboard`/`BrowseItems` (student), `FoundItemForm`/`ReportLost` (reporting), `ClaimFlow` (quiz-based claiming), `FastID`, `StaffPanel` (QR scanning/handover), `AdminDashboard` (stats + item/log management). `LFMSPortfolio`/`RoadAccidentsShowcase` are standalone public showcase pages, unrelated to the app's auth flow.
- `src/components/` — `CameraUpload` (photo capture for reports/IDs), `HandoverScanner` (QR scanning for staff/handover flows), `StateTracker` (visualizes item state progression), `Navbar`, `ProtectedRoute`.
- `src/context/AuthContext.jsx` — the only client-side state/session management; no Redux/Zustand.
- Tailwind theme (`tailwind.config.js`) defines brand colors: `primary` burnt orange `#CC5500`, `secondary` white, `dark` black, `accent` teal `#008080` — reuse these tokens rather than introducing new ad hoc colors.

### Deployment
Backend targets Railway (`backend/railway.json`, `backend/Procfile` running `uvicorn main:app --host 0.0.0.0 --port $PORT`, `backend/DEPLOY_RAILWAY.md`). Frontend targets a static/Vercel-style host consuming `VITE_API_URL`.
