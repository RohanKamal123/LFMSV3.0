---
marp: true
title: Find-X — UIU Lost & Found Management System
---

# Find-X
### UIU's Lost & Found Management System

**From "ask around and hope" to a verified, auditable, AI-assisted recovery pipeline.**

Presented to UIU Authority

---

## The Problem Today

- Lost & found items are tracked informally — a notice board, a drawer in Room 110, word of mouth.
- **No verification.** Whoever asks convincingly enough walks away with an item — including items that aren't theirs.
- **No visibility.** Students have no way to check if their item has been found without physically going to ask.
- **No accountability.** No record of who handed what to whom, or when.
- **Student ID cards** — the single most common lost item on any campus — get no special handling at all.

---

## What Find-X Replaces It With

A single system, three roles, one source of truth:

| Role | What they get |
|---|---|
| **Students** | Report, search, and recover items with cryptographic proof of ownership before anything changes hands |
| **Room 110 Staff** | A live queue of exactly what needs doing — no paperwork, no manual matching |
| **Administration** | Full audit trail, analytics, and an AI assistant that can answer questions and act on the data directly |

---

## How Ownership Is Verified

Every claim goes through a **quiz built from a hidden detail only the real owner would know** — a scratch, a sticker, what's inside a pocket — described by the finder at report time and never shown publicly.

- AI-generated questions with deliberately similar wrong answers (four shades of blue, not "a chair" vs. "a watch") — guessing isn't a viable strategy.
- Need 2 of 3 correct to pass.
- **Passes automatically** → item released into the recovery pipeline.
- **Fails** → the student can escalate directly to admin with one tap, or call the office — nobody is left stuck.

This is the core trust mechanism the entire system is built around.

---

## Two Ways to Get an Item Back

**Path A — Direct handover.** Finder and claimant meet in person; the claimant scans the finder's identity QR code to confirm the exchange. No office visit required.

**Path B — Room 110.** Anyone — finder or claimant — scans one fixed QR code posted at the counter with their own phone. Staff never scans anything: a live queue shows exactly who's dropping off and who's picking up, each one tap away from done.

**Walk-ins are covered too** — someone with no account can still hand in an item (staff logs it in seconds) or collect one (staff releases it by a printed serial number) — the system never requires an app to participate.

---

## Built-In AI, Not Bolted On

Three AI capabilities, each with a plain fallback so the system **never breaks** if AI is briefly unavailable:

1. **Visual Search** — upload a photo of what you lost; AI finds visually similar found items, no need to know the right search terms.
2. **Proactive ID Recovery** — the moment a found student ID's number is read, AI looks up the real owner (registered account, or a university-registry lookup) and **emails them immediately** — even if they never reported it lost.
3. **Admin AI Assistant** — a chat interface that answers real questions about live data ("how many items are pending drop-off?") and can act on request ("resolve ticket #12"), with every action logged like any human action would be.

---

## Security & Trust

- **Real authentication** — password + JWT, not an honor-system login.
- **Every handover cryptographically confirmed** — identity QR codes are short-lived, signed tokens, not just a name typed into a box.
- **Full audit trail** — every state change, every handover, every admin action is logged and reviewable.
- **Role separation enforced server-side**, not just hidden in the UI — an admin account, for instance, is structurally blocked from claiming items, keeping "running the system" and "using the system" cleanly separated.
- **Privacy-respecting** — the hidden ownership detail is never exposed publicly; only staff/admin and the eventual verified claimant ever see it.

---

## What This Looks Like Day to Day

- A student finds a wallet, photographs it, logs it in under a minute.
- The owner finds it in Browse Items — or gets emailed proactively if it was their ID card — and passes a 3-question quiz only they could pass.
- They meet the finder directly, or both check in at Room 110 with a phone tap — staff works a simple queue, no manual cross-referencing.
- Every one of those steps is timestamped and attributable.

---

## Engineering Quality

- Automated test suite (55+ tests) run on every change via CI, exercising real server behavior — not just unit-level mocks.
- Structured logging, rate limiting, and a real health-check/metrics endpoint for operational visibility.
- Database migrations managed properly (Alembic) for safe schema evolution in production.
- Deployed and load-tested end-to-end against production infrastructure, not just a local demo.

---

## Roadmap Ahead

- Formal integration with UIU's real student registry (replacing the development-time mock lookup).
- Expanded analytics for administration — recovery-rate trends, hotspot locations, seasonal patterns.
- Push notifications alongside email for faster owner alerts.
- Extending the AI assistant's toolset as new administrative workflows come up.

---

## The Ask

Find-X is built, tested, and running. We're asking UIU Authority for:

1. **Endorsement** to roll it out as the official Lost & Found channel for the university.
2. **A registry integration point** so proactive ID-owner notification can use real student records instead of a development stand-in.
3. **A Room 110 counter display** to host the physical check-in QR code.

**Every lost item deserves a verified way home. Find-X is that path.**
