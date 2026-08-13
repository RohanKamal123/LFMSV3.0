# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Find-X (LFMS V3.0) is UIU's Lost & Found Management System: a FastAPI + SQLModel (SQLite locally, Postgres in production) backend and a React + Vite + Tailwind frontend, developed as two independent apps in `backend/` and `frontend/` with no shared tooling or monorepo config between them.

## Commands

### Backend (`backend/`)
```bash
cd backend
pip install -r requirements.txt        # runtime deps
pip install -r requirements-dev.txt    # adds pytest + test-only deps, for the test suite
uvicorn main:app --reload              # dev server, API docs at http://localhost:8000/docs
python seed_db.py                      # reset DB and load realistic demo data (Students/Items/Locations)
python -m pytest tests/ -v             # full backend test suite (see Testing below)
```
There is no backend linter or formatter configured — don't invent commands for these.

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
Backend reads `backend/.env` (via `python-dotenv`). Key variables, all optional (the app degrades gracefully without any of them):
- `GEMINI_API_KEY` — enables every AI-backed feature (quiz generation/verification, ID card OCR, visual search captioning, agentic claim review, the admin AI assistant, agentic ID-owner email composition). Each of these has a non-AI fallback path that activates automatically when the key is unset, so the app is fully runnable without it.
- `DATABASE_URL` — switches from local SQLite to Postgres (see `database.py`); unset means SQLite.
- `JWT_SECRET` — signs auth/QR tokens (`services/auth.py`); falls back to an insecure dev default if unset, so **always set this in any real deployment**.
- `MAILERSEND_API_KEY` (preferred) or `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM_EMAIL` — enables real email delivery (`services/notify.py`); unset means notifications stay in-app-only.
- `DATA_DIR` — where the SQLite file and `uploads/` live; lets a deployment point at a persistent volume.
- `ALLOWED_ORIGINS` — comma-separated extra CORS origins beyond the built-in localhost list.
- `DISABLE_RATE_LIMIT` — set by the test suite to bypass `slowapi` rate limiting; don't set this in production.

Frontend reads `VITE_API_URL` to override the default API base of `http://127.0.0.1:8000` (see `frontend/src/api_config.js`).

## Testing

Backend has a real pytest suite (`backend/tests/`, ~55+ tests) that runs against a **live uvicorn subprocess** backed by a throwaway SQLite file — not an ASGI TestClient shortcut — so it exercises the exact code path production traffic does (see the docstring at the top of `tests/conftest.py` for why). The test server always launches with `GEMINI_API_KEY=""`, so tests exercise the deterministic non-AI fallback paths, never real Gemini calls. `db_engine` is a session-scoped fixture for direct DB setup/assertions alongside the HTTP-level tests. CI (`.github/workflows/ci.yml`) runs this suite plus a frontend lint+build on every push.

## Architecture

### Backend structure
- `main.py` — creates the FastAPI app, configures CORS/rate limiting/structured logging middleware, and wires up every router by hand with `app.include_router(..., prefix="/api/<domain>")`. When adding a new API module, register it here.
- `models.py` — single file containing every SQLModel table (`User`, `Item`, `LostItem`, `Claim`, `QuizLog`, `QuizAttempt`, `ClaimReview`, `SupportTicket`, `AuditLog`, `Category`, `Location`, `ItemImage`, `ItemEmbedding`, `FastIDItem`, `FastIDMatch`, `CVScanResult`, `Notification`, `HandoverSession`) plus their enums. This is the single source of truth for schema.
- `database.py` — Postgres via `DATABASE_URL` if set, else a local SQLite file (`database_v2.db`); `SQLModel.metadata.create_all()` runs on app startup. SQLite mode also loads the `sqlite-vec` extension for semantic search (degrades itself gracefully if the platform's Python can't load extensions — see `services/embeddings.py`).
- `migrations/` — Alembic migrations, used against the Postgres deployment. Hand-write migration files rather than `alembic revision --autogenerate` against local SQLite — autogenerate fails trying to reflect the `item_vec` virtual table (`no such module: vec0`) since the sqlite-vec extension isn't loaded in Alembic's plain SQLAlchemy connection.
- `api/` — one router module per domain: `items`, `lost_items`, `claims`, `quiz`, `browse`, `fast_id`, `handover`, `handover_session`, `admin_crud`, `admin_stats`, `admin_agent`, `gatekeeper`, `upload`, `tickets`, `visual_search`. Handlers talk to the DB directly via `sqlmodel.Session`/`select` with no repository/service layer for CRUD — business logic and persistence live together in the router.
- `services/` — cross-cutting logic used by routers: `auth.py` (password hashing, JWT issuance/verification, the short-lived signed handover QR token, `require_role`/`get_current_user`/`get_optional_user` FastAPI dependencies), `gemini.py` (quiz generation + answer verification, with fallbacks), `id_reader.py` (Gemini Vision OCR for student ID cards, with an OpenCV contrast-enhancement retry pass), `claim_agent.py` (agentic second-opinion claim review via Gemini function-calling), `admin_agent.py` (the admin AI assistant, same function-calling pattern with read + guarded write tools), `visual_search.py` (photo-based item search: Gemini-captioned semantic match, with a perceptual-hash fallback), `id_owner_notifier.py` + `mock_university_db.py` (agentic proactive email to a found ID card's owner), `embeddings.py` (Gemini text embeddings + sqlite-vec cosine search, used for lost/found semantic matching and visual search), `notify.py` (in-app `Notification` rows + best-effort email via MailerSend API or SMTP), `state_triggers.py` (time-based `Item` state transitions), `uploads.py` (validated/re-encoded image + video upload), `rate_limit.py`, `logging_config.py`, `metrics.py`.
- `uploads/` — image storage (found-item photos, ID card photos under `uploads/ids/`, ticket attachments), mounted at `/uploads` via `StaticFiles`. Despite being gitignored, some existing files under here and the `database_v2.db` file are already committed to the repo — don't be surprised by git history involving them, and don't fold cleanup of them into unrelated changes.
- `seed.py`, `seed_data.py`, `seed_db.py` — three overlapping seeding scripts from different iterations of the project. **`seed_db.py` is the current/maintained one** (per `README.md`); treat the others as legacy unless told otherwise. It doesn't call the embedding indexer for seeded items, so semantic (lost↔found and visual-search AI-mode) matching returns no hits against freshly-seeded data until an item is created through the normal API.

### Authentication and authorization
Real password + JWT auth, not the passwordless model of earlier project iterations. `api/gatekeeper.py`'s `/register` and `/login` hash passwords with `bcrypt` and issue a JWT (`services/auth.py::create_access_token`, 7-day expiry) carrying the user's id/uiu_id/role. The frontend's `AuthContext` (`frontend/src/context/AuthContext.jsx`) stores `{token, user}` in `localStorage`; `api_config.js::authFetch` attaches the token as a Bearer header. `ProtectedRoute` (`frontend/src/components/ProtectedRoute.jsx`) gates routes client-side by comparing `user.role` against `allowedRoles`. Server-side, sensitive endpoints depend on `get_current_user` (valid JWT required) or `require_role(...)` (valid JWT + role check) rather than trusting client-supplied actor IDs. A separate, much shorter-lived signed token (`create_qr_token`/`decode_qr_token`, 90s expiry, distinct `purpose` claim) backs the handover identity QR shown on a user's own screen — it can't be reused as a session credential even if photographed. Some lower-stakes write endpoints (e.g. archive/state-change logging) still accept a plain `actor_id` parameter purely for the `AuditLog` row, not for authorization — that's an intentional, narrow exception, not a gap to "fix" incidentally.

### Item lifecycle (state machine)
`Item.state` (`ItemState` enum) drives the core workflow:
```
ACTIVE → PENDING_HANDOVER → READY_FOR_PICKUP → RESOLVED → ARCHIVED
                ↓ (72h timeout)
        OVERDUE_SUBMISSION
```
- `ACTIVE`: item is browsable/claimable.
- A `Claim` that passes AI/quiz verification (`api/claims.py`) moves the item to `PENDING_HANDOVER`. Admin accounts cannot file claims (blocked both client-side and server-side in `api/claims.py`/`api/quiz.py`).
- Two recovery paths from there, both in `api/handover.py`:
  - **Path A (direct, no Room 110 involved)**: the finder keeps custody and just displays their own identity QR (Dashboard header card, shown whenever they have an item `PENDING_HANDOVER`); the **claimant** scans it (`claimant-scan-founder`) to receive the item directly → `RESOLVED`. This is claimant-initiated — the finder never scans anything.
  - **Path B (staff-mediated, Room 110)**: no scanning on staff's side at all. A single **fixed QR** (`ROOM_110_QR_VALUE` in `frontend/src/api_config.js`, never regenerated) is displayed at the Room 110 counter (`StaffPanel`'s "Show Check-in QR"); any visitor (finder dropping off, or claimant picking up) scans it with their own camera to reach a check-in screen showing their own identity QR and what they're there for. Staff never scans that QR back — instead staff works from a live **Pending Queue** (`GET /api/handover/queue`, `StaffPanel`'s "Pending Queue" tab) that lists every item currently awaiting drop-off intake or pickup release, across all visitors, straight from item/claim state — no check-in event required to populate it. Staff confirms a drop-off (`staff-scan-tag`, → `READY_FOR_PICKUP`) or releases a pickup (`staff-scan-claimer`, → `RESOLVED`) with one click per queue entry.
  - **Walk-ins with no Find-X account**: staff logs a found item on their behalf from scratch (`POST /api/handover/staff-quick-report` — photo, title, one hidden identifying detail; no finder attached, goes straight to `ACTIVE`/claimable) and, for pickup, looks an item up by its **serial number** — which is just the item's own `id`, not a separate numbering scheme — and marks it picked up (`GET /api/handover/serial/{id}` to look it up, `POST /api/handover/manual-release` to resolve it) with no online identity check.
  - The now-superseded per-staff dynamic-session-QR flow (`api/handover_session.py`) and the item-tag QR scan (`take-by-qr`) are left in the backend, unused by the current frontend, rather than deleted.
- `services/state_triggers.py::update_stale_items()` performs the time-based transitions (`PENDING_HANDOVER` → `OVERDUE_SUBMISSION` after 72h; `RESOLVED` → `ARCHIVED` after 30 days). It's **not** a cron job — it's called lazily inside `api/browse.py`'s feed endpoint on every read.
- Archived found items stay visible in Browse Items (filtered by state) for 30 days after archiving, then drop out of results entirely (`ARCHIVE_RETENTION_DAYS` in `api/browse.py`). An archived item can no longer be claimed digitally — the UI shows a "reclaim in person at Room 110" advisory instead of a claim button.
- Every state-changing action writes an `AuditLog` row (`action_type` + `details`) for traceability.

### Claim verification (quiz)
`api/quiz.py` generates 3 challenging multiple-choice questions from an item's public/private descriptions and location via `services/gemini.generate_quiz` (Gemini, with a mock generator fallback). `api/claims.py` then judges submitted answers via `services/gemini.verify_answers` (again with a keyword-overlap fallback) and auto-approves the claim if enough answers are correct (2/3 if ≥3 questions, else all correct) — this immediately flips the `Item` to `PENDING_HANDOVER`, with no separate human-approval step in the default flow. `services/claim_agent.py` separately runs an **agentic second opinion** on each claim (Gemini function-calling, tools fetch the item's real details + quiz history) that never overrides the automatic decision — it's a `ClaimReview` row surfaced to staff/admin in the "Claims Review" admin tab. After a rejected quiz, the student can escalate: message admin (pre-filled support ticket) or call the admin phone number directly, both surfaced in `ClaimFlow.jsx`.

### Fast ID (student ID cards)
A parallel, simpler pipeline for student ID cards, separate from the main `Item`/`Claim` model: `FastIDItem` rows (type `FOUND` or `LOST`) are matched purely by ID number. Found-side entries get their ID auto-extracted from a photo via `services/id_reader.py` (Gemini Vision, retried with OpenCV contrast enhancement on failure); lost-side entries are entered manually and format-validated (9–10 digits). A match auto-fires a `FastIDMatch` plus `Notification`s to the owner and an admin whenever a `FOUND` and `LOST` entry share an ID. **Additionally**, when a found ID's number is extracted and there's *no* existing in-app `LOST` report to match against, `services/id_owner_notifier.py` runs an agentic step: look the ID up as a registered Find-X user first (their real signed-up email), else in `services/mock_university_db.py` (a stand-in demo ID→name/email dataset for a real university registry this app can't access during development), and email that person directly that their card was found — composing the email via Gemini with a fixed-template fallback. Either way, admin gets a "report back" `Notification` + `AuditLog` row.

### Other AI-backed features
- **Visual (photo) search** (`services/visual_search.py`, `POST /api/visual-search/`, `VisualSearch.jsx`): upload a photo of a lost item; the backend captions it via Gemini Vision and reuses the existing text-embedding semantic search (`services/embeddings.py`) against found items' descriptions, returning ranked matches. Falls back to a plain perceptual-hash (dHash) image comparison when no `GEMINI_API_KEY` is set or captioning fails.
- **Admin AI assistant** (`services/admin_agent.py`, `POST /api/admin-agent/ask`, admin-only, `AdminDashboard.jsx`'s "AI Assistant" tab): a chat-style agent with the same Gemini function-calling pattern as `claim_agent.py` — read tools over stats/items/claims/tickets/users/audit logs, plus two guarded write tools (resolve a ticket, archive an item), each logged to `AuditLog`. Degrades to a clear "AI unavailable" reply with no key configured.

### Support tickets
`SupportTicket` rows (`api/tickets.py`) can carry an optional `attachment_url` — image *or* short video (`services/uploads.py::save_validated_attachment`, a separate, less-strict pipeline from item photos so video can't be smuggled into item uploads). Staff/admin respond and set status via the admin "Support Tickets" tab.

### Frontend structure
- `src/App.jsx` — all routing (React Router v6). Routes are grouped by role under `ProtectedRoute` wrappers (`STUDENT`, `STAFF`/`ADMIN`, `ADMIN`-only, or any authenticated role); `Gatekeeper` is the public login/entry page.
- `src/pages/` — one page per major flow: `Gatekeeper` (login/register), `Dashboard`/`BrowseItems` (student), `FoundItemForm`/`ReportLost` (reporting), `ClaimFlow` (quiz-based claiming, with the rejection-escalation UI), `FastID`, `VisualSearch` (photo-based lost-item search), `StaffPanel` (Room 110 terminal: check-in QR display, pending queue, walk-in report/release), `AdminDashboard` (analytics, log monitoring, item/ticket/claim CRUD, and the AI Assistant chat). `LFMSPortfolio`/`RoadAccidentsShowcase` are standalone public showcase pages, unrelated to the app's auth flow.
- `src/components/` — `CameraUpload` (photo capture for reports/IDs — supports gallery/local files, not just live camera), `HandoverScanner` (generalized QR scanner for Path A, `direction="give"|"receive"` prop selects which endpoint it calls), `TicketModal` (support ticket create/view, with attachment upload and prefill support for the claim-rejection escalation flow), `StateTracker`, `Navbar`, `ProtectedRoute`.
- `src/context/AuthContext.jsx` — the only client-side state/session management; no Redux/Zustand.
- `src/api_config.js` — `API_BASE_URL`, `authFetch` (attaches the JWT), and `ROOM_110_QR_VALUE` (the fixed Path B check-in QR content, shared between `Dashboard.jsx` and `StaffPanel.jsx`).
- Tailwind theme (`tailwind.config.js`) defines brand colors: `primary` burnt orange `#CC5500`, `secondary` white, `dark` black, `accent` teal `#008080` — reuse these tokens rather than introducing new ad hoc colors.

### Deployment
Both halves deploy to **Render**: backend per `backend/render.yaml` (`uvicorn main:app --host 0.0.0.0 --port $PORT`, persistent disk at `/data` for SQLite + uploads), frontend as a static build consuming `VITE_API_URL`. `backend/railway.json`/`Procfile`/`DEPLOY_RAILWAY.md` and `frontend/vercel.json` are leftover config from an earlier deployment target and don't reflect where the app actually runs — don't trust them over `render.yaml`.
