# Study Tracker — SSC 2026

A personal study tracker for an SSC candidate. Built around one real problem:
her tutors and coaching centres change almost every month, so the app treats
teachers as something you *start and stop*, never something you delete.

Offline-first — everything works with no backend at all. Cloud sync is optional
and switched on with two environment variables.

---

## What it does

| Page | What it's for |
|---|---|
| **Today** | Countdown to the exam, today's classes, daily routine, study plan, homework due, study-goal progress |
| **Calendar** | Month view; per day, plan what to study and afterwards record what was *actually* covered |
| **Teachers** | Every tutor / coaching centre, online or offline, with the subjects they cover and their monthly fee |
| **Schedule** | Recurring weekly class slots (Sat–Fri week) |
| **Syllabus** | NCTB chapter list per subject, tracked Not started → Learning → Done → Revised, with a confidence rating |
| **Homework** | Tasks grouped by overdue / today / tomorrow / later |
| **Results** | Model tests and school exams, with a trend line and weakest-subject ranking |
| **Study timer** | Stopwatch that logs self-study minutes per subject, plus a daily streak and 14-day chart |
| **Routine & goals** | Repeating daily habits with a 7-day consistency bar, and numeric goals |
| **Fees** | Monthly fee per teacher (paid / unpaid) next to how many classes actually happened |
| **Settings** | Subjects, exam date, study goal, theme, sync, and backup |

### Two design decisions worth knowing

**Teachers are closed out, not deleted.** When she stops with a tutor, "Stopped
studying" sets an end date and switches off their class slots. Old logs, fees
and history stay intact, and the teacher can be resumed later. Delete is there
too, but it cascades and is meant for typos.

**Homework entered in a class log appears in the Homework list automatically.**
Logging a class ("covered X, homework Y") mirrors the homework into the task
list under a derived id, so re-editing the log updates the same task instead of
creating duplicates.

---

## Running it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Other commands:

```bash
npm run build      # production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

Node 20+ recommended.

---

## Deploying to Vercel (free tier)

1. Push this repository to GitHub.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Framework preset is detected as **Next.js**. Leave every build setting alone.
4. **Deploy.**

That's the whole thing. With no environment variables set, the app runs fully
offline: all data lives in that browser's `localStorage`.

---

## Optional: cloud sync with Supabase (free tier)

Without this, her data lives in one browser — phone and laptop stay separate,
and clearing browser data wipes it. Turn sync on to share one dataset across
devices.

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.
4. In Vercel → your project → **Settings → Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |

5. Redeploy.
6. Open the app → **Settings → Cloud sync → Turn on sync for this device**. Copy
   the sync code it generates.
7. On her other device, open the app → **Settings → Cloud sync** → paste the code
   under *"use an existing code"* → **Connect**.

### How the sync works

The entire app state is stored as one JSON document keyed by a secret UUID (the
"sync code"). Reconciliation is last-write-wins on a timestamp: on load, whichever
copy was edited more recently wins, and the losing copy is kept as a restorable
snapshot (**Settings → Restore last snapshot**).

That means it is **not** built for two devices editing at the same moment — the
later save wins the whole document. For one student on a phone and a laptop, this
is the right trade: no accounts, no login, no merge conflicts to reason about.

### Security note

The `study_state` table has RLS enabled with **no policies**, so the anonymous
API key cannot touch it directly. All access goes through two `SECURITY DEFINER`
functions that only ever read or write the single row matching the code passed
in. Knowing one sync code reveals nothing about any other.

The practical consequence: **the sync code is the password.** Anyone who has it
can read and change the data. It is not shown anywhere except Settings — keep it
private, and don't put it in a screenshot.

---

## Backups

Cloud sync is convenience, not a backup — a bad edit syncs everywhere.

**Settings → Export backup** downloads a JSON file. Do this every few weeks. It
is the only copy that survives clearing browser data, and it imports back through
**Import backup**.

---

## Tech

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — theme tokens in `app/globals.css`, light/dark aware
- **Supabase** — optional, JSON document store via two RPC functions
- Charts are hand-rolled inline SVG (`components/charts.tsx`), no charting library

Everything is client-side; there are no API routes and no server-side data.

```
app/          one folder per page
components/   Shell (nav), ui.tsx (Card/Modal/Field/…), charts.tsx
lib/
  types.ts       the whole data model
  store.tsx      React context, CRUD helpers, persistence + sync
  storage.ts     localStorage + Supabase adapters
  selectors.ts   derived data (progress, streaks, pace, gaps)
  syllabus.ts    default NCTB subject + chapter lists
  date.ts        local-timezone-safe date handling
supabase/schema.sql
```

### A note on the syllabus data

`lib/syllabus.ts` holds the default NCTB Science-group subject and chapter lists.
Board editions differ year to year, so **treat it as a starting point** — check it
against her actual printed books. Every subject and chapter is editable, and new
ones can be added from Settings and the Syllabus page.

### A note on dates

Calendar days are handled as plain `YYYY-MM-DD` strings in local time and never
round-tripped through `Date.toISOString()`, which would shift to UTC and land on
the previous day for anyone east of Greenwich. The week runs **Saturday →
Friday**, matching the Bangladeshi school week.
