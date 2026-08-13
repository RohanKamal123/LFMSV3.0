# Find-X — Code Architecture

A technical reference for developers working on Find-X (LFMS V3.0). For quick day-to-day guidance see `CLAUDE.md`; this document goes deeper on *why* the system is shaped the way it is.

---

## 1. System Overview

```
┌─────────────────────┐         HTTPS / JSON          ┌──────────────────────┐
│   React + Vite SPA   │ ─────────────────────────────▶│   FastAPI backend    │
│   (frontend/)        │◀───────────────────────────── │   (backend/)          │
│   Tailwind CSS        │        JWT Bearer auth        │   SQLModel ORM        │
└─────────────────────┘                                └───────────┬──────────┘
                                                                      │
                                       ┌──────────────────────────────┼──────────────────────────┐
                                       │                              │                          │
                              ┌────────▼────────┐          ┌──────────▼─────────┐       ┌─────────▼────────┐
                              │ SQLite (dev) or  │          │  Gemini API         │       │  MailerSend API   │
                              │ Postgres (prod)   │          │  (google-genai)     │       │  or SMTP          │
                              │ + sqlite-vec      │          │  optional, key-gated│       │  optional          │
                              └───────────────────┘          └─────────────────────┘       └────────────────────┘
```

Two independent apps, no monorepo tooling, no shared package between them — `frontend/` talks to `backend/` purely over HTTP. Both deploy separately to Render (see §8).

---

## 2. Backend

**Stack:** FastAPI + SQLModel (Pydantic + SQLAlchemy), `uvicorn`, JWT auth (`PyJWT` + `bcrypt`), `slowapi` rate limiting, Alembic migrations, `google-genai` for all AI calls, `sqlite-vec` for local vector search.

### 2.1 Layout

```
backend/
├── main.py              # app factory, middleware, router registration
├── database.py           # engine setup (SQLite or Postgres), vec extension loading
├── models.py              # every SQLModel table + enum, single source of truth
├── migrations/            # Alembic, hand-written (see §2.4)
├── api/                    # one router module per domain, thin - talks to DB directly
├── services/                # cross-cutting logic: auth, AI, email, uploads, embeddings
├── uploads/                   # local file storage (dev) / persistent disk (prod)
└── tests/                      # pytest suite against a live subprocess server
```

There is **no repository/service layer for plain CRUD** — routers in `api/` call `session.exec(select(...))` directly. `services/` exists specifically for logic that's genuinely cross-cutting (auth, AI calls, email, file validation) or reused across multiple routers, not as a blanket abstraction layer.

### 2.2 Data model (`models.py`)

Core entities and how they relate:

- **`User`** — one row per person, `role` ∈ {`STUDENT`, `STAFF`, `ADMIN`}, `password_hash` (bcrypt).
- **`Item`** (found items) ←→ **`ItemImage`** (1:N photos) ←→ **`Category`**/**`Location`** (lookup tables).
- **`LostItem`** — a parallel, simpler table for lost reports; not a subtype of `Item`.
- **`Claim`** — links a `User` (claimant) to an `Item`, carries `quiz_score`/`is_verified`/`status`.
- **`QuizAttempt`** / **`QuizLog`** — the generated questions (with server-only answer key) and the graded log entries for a claim.
- **`ClaimReview`** — the agentic second-opinion output for a claim (§5.1).
- **`FastIDItem`** / **`FastIDMatch`** / **`CVScanResult`** — the parallel ID-card pipeline (§4).
- **`SupportTicket`** — user-filed tickets, optional `attachment_url` (image or video).
- **`AuditLog`** — append-only action log; every state-changing endpoint writes one.
- **`Notification`** — in-app alerts, paired with best-effort email (§6).
- **`ItemEmbedding`** — maps a found/lost item to a row in the `item_vec` sqlite-vec virtual table (§5.3).
- **`HandoverSession`** — the now-superseded per-staff dynamic-QR pickup flow; kept in the schema, unused by the current frontend (§3.2).

### 2.3 No independent server-side authorization on *everything*

Sensitive endpoints depend on `get_current_user`/`require_role(...)` (JWT-backed), but some lower-stakes write endpoints still accept a plain `actor_id` for audit-log attribution only, not authorization — a deliberate, narrow carryover, not an oversight.

### 2.4 Migrations

Alembic against the production Postgres database. `alembic revision --autogenerate` **does not work** against local SQLite — it fails trying to reflect the `item_vec` virtual table (sqlite-vec's `vec0` module isn't loaded in Alembic's bare SQLAlchemy connection). Write migration files by hand for schema changes; verify them by hand-testing against a local Postgres instance if possible.

---

## 3. The Item Lifecycle — State Machine

```
ACTIVE ──(claim quiz passes)──▶ PENDING_HANDOVER ──▶ READY_FOR_PICKUP ──▶ RESOLVED ──(30d)──▶ ARCHIVED
                                        │
                                        ▼ (72h no drop-off)
                                OVERDUE_SUBMISSION
```

`services/state_triggers.py::update_stale_items()` drives the two time-based transitions. It is **not a scheduled job** — it runs lazily, called from `api/browse.py`'s feed endpoint on every read, which is sufficient for a system where the feed is checked constantly and a few minutes of staleness on a timeout doesn't matter.

### 3.1 Path A — Direct Handover (claimant-initiated)

The finder never scans anything — they just display their own identity QR (a short-lived, purpose-scoped JWT, 90s expiry, distinct `purpose` claim so it can't double as a session token). The **claimant** scans it:

```
POST /api/handover/claimant-scan-founder
  → verifies caller has an APPROVED claim on the item
  → verifies the scanned QR belongs to item.finder_id
  → item.state = RESOLVED
```

### 3.2 Path B — Room 110 (no staff scanning)

This is the most re-engineered part of the system across this project's iterations. The final design:

1. **One fixed QR**, `ROOM_110_QR_VALUE` (a constant string, not a signed token — it carries no identity, just a "you're at the counter" signal), displayed at the physical counter. Any visitor scans it with their own camera.
2. Scanning it is **purely client-side routing** — no backend call. It takes the visitor to a check-in screen showing their own identity QR plus a summary of what they're there for, computed from data the frontend already has loaded (their found reports, their claims).
3. Staff **never scans anything**. Instead, `GET /api/handover/queue` returns every item currently awaiting drop-off intake (`PENDING_HANDOVER`/`OVERDUE_SUBMISSION`, with the finder's identity) or pickup release (approved claim + `READY_FOR_PICKUP`, with the claimant's identity) — pulled straight from existing state, with no dependency on anyone having "checked in" first. Staff acts directly from this list:
   - `POST /api/handover/staff-scan-tag` (by item_id) → `READY_FOR_PICKUP`
   - `POST /api/handover/staff-scan-claimer` (by item_id + claimant_uiu_id) → `RESOLVED`

An older `GET /api/handover/lookup` (staff scans the *visitor's* QR to pull up their items) exists in the backend and is fully tested, but the current frontend uses the Pending Queue instead — scanning a visitor's QR one at a time doesn't scale as well as a live list staff can just work through.

### 3.3 Walk-ins (no Find-X account)

Two endpoints exist specifically because not everyone who interacts with Room 110 has the app:

- `POST /api/handover/staff-quick-report` — staff logs a found item from scratch (photo, title, one hidden detail) on behalf of a walk-in finder. No `finder_id`; goes straight to `ACTIVE`.
- `GET /api/handover/serial/{item_id}` + `POST /api/handover/manual-release` — staff looks an item up by its **serial number** (which is just `Item.id` — there's no separate inventory numbering scheme) and releases it to a walk-in claimant with no online identity check, since ownership was already verified in person.

---

## 4. Fast ID — A Parallel, Simpler Pipeline

Student ID cards are common enough to warrant their own lightweight flow, deliberately **not** built on top of `Item`/`Claim`:

- `FastIDItem(type=FOUND)` — photo → Gemini Vision OCR (`services/id_reader.py`, with an OpenCV contrast-enhancement retry pass on the first failure) extracts the ID number.
- `FastIDItem(type=LOST)` — manual entry, format-validated (9–10 digits).
- A `FOUND`/`LOST` pair sharing an ID number auto-fires a `FastIDMatch` and notifies both the reporter and admin.
- **Agentic extension:** when a `FOUND` ID has no matching in-app `LOST` report, `services/id_owner_notifier.py` looks the ID up directly — a registered Find-X `User` first, else `services/mock_university_db.py` (a stand-in demo dataset for a real university registry this app can't access during development) — and emails that person proactively. The email body is Gemini-composed with a fixed-template fallback. Either way, admin gets a report-back notification.

---

## 5. AI Features — Design Pattern

Every AI-backed feature in Find-X follows the same shape: **try Gemini, fall back to a deterministic path if unavailable**, so the app is fully usable with no API key configured. Three distinct techniques are used depending on the problem:

### 5.1 Function-calling agents (claim review, admin assistant)

`services/claim_agent.py` and `services/admin_agent.py` pass plain Python functions as `tools=[...]` to `client.models.generate_content(...)`; the `google-genai` SDK's automatic function-calling loop lets the model call them (read data, and for the admin agent, take a small set of guarded write actions), then produces a final natural-language response — all within one call. Write tools commit and log to `AuditLog` independently of whether the final summary succeeds, so a quota failure on the last leg of the exchange doesn't silently lose an action that already happened (`admin_agent.py` explicitly surfaces "done, but couldn't summarize" in that case).

### 5.2 Structured generation (quiz, ID OCR)

`services/gemini.py::generate_quiz`/`verify_answers` and `services/id_reader.py::extract_id_from_image` ask Gemini for a specific JSON shape or a short extracted value, parse the response, and fall back to a deterministic generator (quiz) or a clear "AI unavailable" error code (OCR) on failure.

### 5.3 Embeddings + vector search (semantic matching, visual search)

`services/embeddings.py` embeds item descriptions via `gemini-embedding-001` and stores them in a `sqlite-vec` virtual table (`item_vec`, cosine distance) for fast nearest-neighbor lookup — used both for proactive lost↔found matching on report creation, and as the backbone of visual search: `services/visual_search.py` captions an uploaded photo via Gemini Vision, embeds the caption, and searches it against found-item embeddings using the exact same `find_similar()` call the text-matching feature uses. If no key is configured (or captioning fails), visual search instead computes a perceptual hash (dHash, pure PIL, no AI) of the query photo and compares it against found-item photos directly — cruder, but fully functional offline.

`sqlite-vec` only loads on SQLite; Postgres deployments skip vector search entirely rather than printing a misleading "unavailable" warning (`database.py`).

---

## 6. Notifications & Email

`services/notify.py::send_notification` writes an in-app `Notification` row and, best-effort, sends an email if the recipient has one — preferring MailerSend's HTTP API (`MAILERSEND_API_KEY`) over raw SMTP, since many PaaS free tiers block outbound SMTP ports entirely. `send_email_direct` is the public entry point for emailing an address with **no corresponding `User` row** (the mock-registry ID-owner-notification path). Email failures are logged and swallowed — a notification failure must never block the request that triggered it.

---

## 7. Frontend

**Stack:** React 18, Vite, React Router v6, Tailwind CSS, `qrcode.react` + `html5-qrcode` for QR display/scanning, `recharts` for admin analytics.

- `src/context/AuthContext.jsx` is the *only* client state management — no Redux/Zustand. It stores `{token, user}` in `localStorage`.
- `src/api_config.js` — `API_BASE_URL`, `authFetch` (attaches the JWT Bearer header), `ROOM_110_QR_VALUE` (shared constant between the student check-in scanner and the staff QR display, so they can never drift out of sync).
- `ProtectedRoute.jsx` gates routes client-side by role; the real enforcement is server-side.
- `components/HandoverScanner.jsx` is a single generalized component for Path A, parameterized by a `direction` prop (`'give'` for the original finder-scans-claimant endpoint, `'receive'` for the current claimant-scans-finder one) rather than two near-duplicate components.
- One page per major flow under `src/pages/` (see `CLAUDE.md` for the full list) — no nested feature-folder structure, deliberately flat.

---

## 8. Deployment

Both halves deploy to **Render**:
- **Backend** — `backend/render.yaml`, `uvicorn main:app --host 0.0.0.0 --port $PORT`, a 1GB persistent disk mounted at `/data` for the SQLite file and uploads (or `DATABASE_URL` pointed at managed Postgres).
- **Frontend** — static build (`npm run build`), served with `VITE_API_URL` pointed at the backend's Render URL.

`backend/railway.json`/`Procfile`/`DEPLOY_RAILWAY.md` and `frontend/vercel.json` are leftovers from an earlier deployment target and don't reflect the live setup — `render.yaml` is authoritative.

---

## 9. Testing

`backend/tests/` runs a real pytest suite against a **live `uvicorn` subprocess**, not an ASGI `TestClient` — chosen specifically to sidestep an `httpx` version conflict between FastAPI 0.109's pinned Starlette and `google-genai`'s `httpx>=0.28` requirement, and because it exercises the exact same code path production traffic does. The test server always launches with `GEMINI_API_KEY=""`, so the suite exercises every feature's deterministic fallback path deterministically — no flakiness from real model calls, no quota consumption. `db_engine` (a session-scoped SQLModel engine fixture pointed at the same file the test server uses) backs direct-DB setup and assertions alongside the HTTP-level tests. CI (`.github/workflows/ci.yml`) runs the full suite plus a frontend lint+build on every push.

There is no frontend automated test suite; UI changes are verified manually (and, during development, via a Playwright driver script) against a running dev server.

---

## 10. Where to Look for What

| I want to...                                   | Look at |
|---|---|
| Add a new API endpoint                          | `api/<domain>.py`, register the router in `main.py` |
| Change the item state machine                   | `api/handover.py`, `api/claims.py`, `services/state_triggers.py` |
| Add/change a DB table                            | `models.py`, then a hand-written Alembic migration |
| Touch anything AI-backed                          | The matching `services/*.py` file — always add a fallback |
| Change auth/JWT behavior                          | `services/auth.py` |
| Add a new frontend page                            | `src/pages/`, wire into `src/App.jsx` + `Navbar.jsx` |
| Understand what actually happened in production     | The `AuditLog` table / admin Log Monitoring tab |
