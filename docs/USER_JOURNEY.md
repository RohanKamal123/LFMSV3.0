# Find-X — Student User Journey

This document walks through the Find-X experience from the point of view of a UIU **student** — the primary user of the system. It follows the actual screens and flows in the deployed app, end to end: signing up, reporting items, searching, claiming, and getting an item back.

---

## 1. Getting In — Gatekeeper

Every session starts at the public **Gatekeeper** screen (`/`).

- **New here?** Register with your UIU ID, name, email, phone, and a password. Registration is self-service — no admin approval step. New accounts default to the `STUDENT` role.
- **Returning?** Sign in with your UIU ID and password. A show/hide toggle on the password field avoids typos on mobile.

On success you land on your **Student Hub** (`/dashboard`). The Hub greets you with **"Welcome"** the very first time you ever log in, and **"Welcome back"** on every visit after that — the system remembers via your login history, not a cookie trick.

---

## 2. The Student Hub — Command Center

The Hub Overview tab is the first thing you see, and it adapts to what's actually happening in your account:

- **Fast ID** is always front and center — the fastest path to recovering a lost student ID card.
- **Report found / Find my lost item** — the two entry points into the core flow.
- **Room 110 drop-off required** banner — appears only if you're holding an item you found that still needs to be dropped off, with a countdown against the 72-hour window.
- **Handover scan card** — appears only when there's an actual handover to complete:
  - *"Finder ID"* — if someone has successfully claimed an item you found, your own identity QR appears here so a claimant can scan it directly off your phone (Path A).
  - *"Receive directly (Path A)"* — if you're the claimant, and the finder still has physical custody, you scan the finder's QR to receive the item on the spot.
  - *"Check in at Room 110 (Path B)"* — opens a scanner. Point it at the fixed QR code posted at the Room 110 counter to check in; the app then shows your own ID QR for staff, plus a summary of what you're there for (drop-off, pickup, or both).

Nothing here is ever shown speculatively — a brand-new account with nothing to hand over sees a clean Hub with no scan prompts at all.

---

## 3. Reporting a Found Item

`Report Found` walks you through logging something you picked up:

1. **Photo** — take a live photo or choose one from your gallery/files (both are supported, not just the camera).
2. **Title, category, location, date/time found.**
3. **Public description** — what anyone browsing can see.
4. **Private description** — a hidden detail only the real owner would know (a scratch, a sticker, what's inside a pocket). This is the answer key the ownership quiz is built from later, so be specific.

The item goes live immediately as `ACTIVE` — anyone can browse it and claim it.

## 4. Reporting a Lost Item

`Report Lost` is the mirror image: title, category, location, date lost, and a description. If a found item's description looks similar, the system's AI matching can proactively notify you (see §6).

---

## 5. Fast ID — Student ID Cards

Student ID cards get a dedicated fast-path, separate from the general item flow, because they're the single most common thing lost on campus:

- **Found an ID?** Snap a photo. AI (Gemini Vision) reads the ID number straight off the card. If someone has already reported that exact ID lost, both of you are notified instantly and the admin is looped in. If nobody has reported it lost *yet*, Find-X doesn't just sit on it — an agentic step looks the ID number up directly (your own registered account first, or a university-registry lookup if you're not a Find-X user) and **emails the owner right away**, telling them their card was found.
- **Lost your ID?** Enter the number manually (format-checked, 9–10 digits). If it's already been found, you're matched immediately.

## 6. Visual Search — Find It By Photo

Sometimes you don't know the right words for what you lost, but you have a mental picture of it. **Visual Search** (`/visual-search`) lets you upload a photo of your lost item — AI compares it against every found item's photo in the registry and returns the closest visual matches, ranked by similarity, each one click away from starting a claim. If the AI service is temporarily unavailable, the search still works using a basic image-comparison fallback, just with less nuance.

---

## 7. Browse Items

`Browse Items` is the full searchable registry of both found and lost reports.

- **Search** by name, **filter** by category, location, and state (active, pending handover, ready for pickup, resolved, archived).
- **Time filter, front and center** — because "when" narrows a fast-moving list faster than "what kind," a prominent row of quick presets (last 1/7/30 days) plus a custom date range sits above the other filters.
- Clicking a card opens full detail: photos, description, and a public timeline of what's happened to that item.
- **Archived items** stay visible for 30 days after being archived — if you spot yours there, it's no longer claimable online; the card tells you to bring your ID to Room 110 in person instead.

---

## 8. Claiming an Item

Found the item you lost? From its detail card, **Claim item** starts the ownership-verification flow:

1. Describe, in your own words, how you know it's yours.
2. The system (AI, with a deterministic fallback) generates **3 challenging multiple-choice questions** from the item's description — including at least one from the hidden/private detail only the real owner would know. Wrong-but-plausible answer options are deliberately similar (e.g. four shades of blue), so guessing isn't a viable strategy.
3. Answer all three. You need at least 2/3 correct (or 3/3 if there are fewer than 3 questions).

**Pass**, and the claim is auto-approved on the spot — the item flips to `PENDING_HANDOVER` and you get a QR code to receive it. **Fail**, and you're told the security score and offered two direct escalation options: **message admin** (opens a pre-filled support ticket describing your claim and why you still think it's yours) or **call admin** directly at the posted number. Admin accounts can't file claims themselves — claiming is a student-only flow.

---

## 9. Getting the Item Back

Once your claim is approved, there are two ways to actually receive the item, and the app only shows you the ones that currently apply:

- **Path A — direct handover.** If the finder still has the item and hasn't dropped it off, scan their ID QR (shown on their own Hub) to receive it directly, in person, no staff involved.
- **Path B — Room 110.** If the item's already been dropped off (or you'd rather go through staff), check in at Room 110 by scanning the fixed counter QR with your phone. Show staff the ID QR that appears — they'll find your item in their queue and hand it over.

Either way, the moment the handover completes the item is `RESOLVED`, and every trace of "come pick this up" disappears from your Hub and My Claims tab — no stale prompts.

---

## 10. Keeping Track — My Claims, My Reports, Timeline

- **My Claims** — every claim you've filed, its verification score, and a live status message that always reflects the item's *current* real-world state (not a stale snapshot from when you claimed it).
- **My Reports** — everything you've found or lost, with state badges and an "action required" flag if a drop-off is overdue.
- **Timeline** — a chronological feed of notifications: matches, handover confirmations, system alerts.

---

## 11. Support

Stuck at any point? The Support panel (available from the navbar everywhere) lets you open a ticket — subject, category, description, and optionally attach an **image or short video** as evidence. You can track every ticket you've filed and see staff's response once it lands.

---

## Summary: the whole loop

```
Report found item  →  (someone claims it)  →  quiz-verified  →  Path A or Room 110  →  RESOLVED
Report lost item   →  (Fast ID / Visual Search / Browse)      →  find it            →  claim it
```

Every step degrades gracefully if the AI backing it is temporarily unavailable — the app never becomes unusable, just a little less automated.
