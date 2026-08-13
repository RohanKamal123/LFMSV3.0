# Find-X — Admin User Journey

This document covers the **Admin Dashboard** (`/admin`, `ADMIN` role only) — the control center for running the whole system: analytics, moderation, data correction, and an AI assistant that can act on live data.

---

## 1. Signing In

Admin accounts sign in through the same Gatekeeper as students and staff. The navbar shows **Dashboard** (this admin hub), plus full access to **Browse Items** and **Staff Panel** — admins can see everything staff can, but are deliberately blocked from filing claims themselves (claiming is a student-only flow, enforced both in the UI and on the backend).

The dashboard auto-refreshes every 10 seconds, with a manual refresh button for an immediate pull. Nine tabs cover every operational surface:

---

## 2. Analytics

The default landing tab — system-wide metrics at a glance: item counts by state, claim outcomes, ticket volume, resolution trends over time. The **"Right Now"** stat tiles are clickable — tapping one jumps straight into a pre-filtered Browse Items or CRUD view instead of just displaying a number.

## 3. Log Monitoring

A searchable, filterable feed of every `AuditLog` row in the system — logins, item lifecycle transitions, handovers, claim decisions, ticket actions. Every state-changing action anywhere in the app writes one of these, so this tab is the single source of truth for "what actually happened and when." Entries are grouped by category (auth/item/handover/claim/ticket) and color-coded by severity, with anything destructive or overriding flagged for quick scanning.

## 4. Items CRUD

Direct create/read/update/delete on the found-item registry — for correcting bad data, merging duplicates, or removing spam reports. This is deliberately separate from the "Flow CRUD" tab below: Items CRUD edits the *content* of a report; Flow CRUD manipulates its *state*.

## 5. 110 Inventory

A read-focused view of everything currently in Room 110's physical custody (`READY_FOR_PICKUP`), for reconciling the digital record against what's actually sitting on the shelf.

## 6. ID Card CRUD

The equivalent of Items CRUD for the Fast ID pipeline — correcting misread ID numbers, resolving stuck matches, or manually verifying a match staff couldn't confirm automatically.

## 7. Flow CRUD

Manual state-machine overrides — force an item into a specific `ItemState` directly, for edge cases the normal flow can't reach on its own (a lost handover session, a miscategorized report, a stuck claim). Used sparingly; every change here is logged like any other state transition.

## 8. Support Tickets

Every ticket filed by students and staff, with category, description, and — if the reporter attached one — an **image or video** shown inline (video as a "view attached" link, image as a thumbnail). Admin sets status (open → in progress → resolved/closed) and writes a response the reporter sees on their end.

## 9. Claims Review — Agentic Second Opinion

Every claim gets an automatic pass/fail from the quiz engine, but this tab adds a second layer: an AI agent (Gemini, using function-calling to pull the item's real private details and the claim's full quiz history) reviews each claim independently and posts a recommendation — **APPROVE**, **REJECT**, or **NEEDS_HUMAN_REVIEW** — with a confidence score, reasoning, and any red flags. **This never overrides the automatic decision** — it's an assistive second opinion for staff/admin to weigh before manually approving or rejecting a claim from this same screen.

## 10. AI Assistant

A chat interface with an AI agent that has direct, live access to system data and a small set of guarded actions:

- **Ask it anything** about current state — item counts, open tickets, recent activity, specific items or claims — and it looks up the real answer via tool calls rather than guessing.
- **Tell it to act**, and it will, using exactly two write capabilities: *resolve a support ticket* (with your specified response) and *archive a found item*. Every action it takes is logged to the audit trail exactly like a manual action would be, and shown back to you in the chat as a confirmation, not just claimed in prose.
- If a request is ambiguous (no specific ID given for an action), it asks for clarification instead of guessing.
- If the AI backend isn't configured or is temporarily unavailable, it says so plainly rather than pretending to work.

This is the same underlying pattern as the Claims Review agent, generalized: give the model read tools to ground its answers in real data, and a narrow, explicitly-logged set of write tools for anything it's asked to actually do.

---

## Admin's relationship to the rest of the system

Admin sees everything staff and students see, plus the tools above — but is intentionally kept **out** of the claiming flow itself (no "Claim item" button anywhere in an admin session) to keep a clean separation between *running* the system and *using* it. Every admin action, whether from a CRUD panel or the AI assistant, lands in the same audit log staff and system actions do — there's no separate, unlogged admin backdoor.
