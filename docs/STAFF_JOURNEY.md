# Find-X — Staff User Journey

This document covers the **Room 110 Staff Panel** — the terminal used by UIU Lost & Found staff to physically receive and release items. It's built around one principle: **staff never has to scan anything.** All scanning happens on the visitor's side; staff works from a live queue.

---

## 1. Signing In

Staff accounts (`STAFF` role) sign in through the same Gatekeeper as everyone else. The navbar then shows **Staff Panel** instead of the student Hub.

## 2. The Command Hub

`Staff Panel` (`/staff`) opens on a four-tile hub, split into two groups:

**Room 110 operations:**
- **Show Check-in QR** — displays the one fixed QR code for the room. It never changes, and it's the same code regardless of which staff member is on shift. Pull it up on a monitor at the counter (or have it printed) so visitors can scan it with their own phone the moment they walk in.
- **Pending Queue** — the working list. No scanning required to use it.

**Walk-ins with no Find-X account:**
- **Log a Walk-in Drop-off** — for someone who hands over an item without ever opening the app.
- **Release by Serial Number** — for someone picking up an item with no digital claim record.

---

## 3. How a Visitor Checks In

A student (or anyone with a Find-X account) walks up to the counter, opens Find-X on their own phone, and taps **"Check in at Room 110"** from their Hub. Their camera scans the fixed counter QR. That's the *only* scan in the entire Path B flow, and staff isn't involved in it at all — it just puts the visitor on their own "here's my ID QR" screen, which shows staff a target to look for on the queue instead of the visitor's phone.

---

## 4. Working the Pending Queue

This is where staff spends most of their time. It's a live, auto-populated list — an item shows up here the instant it needs staff attention, with **no check-in step required** to populate it:

- **Drop-offs pending intake** — every item currently `PENDING_HANDOVER` or `OVERDUE_SUBMISSION`, with the finder's name, UIU ID, item photo, and serial number. One tap on **Confirm drop-off** moves it to `READY_FOR_PICKUP` and puts it in Room 110's physical custody.
- **Pickups ready for release** — every item with an *approved* claim sitting at `READY_FOR_PICKUP`, with the claimant's name, UIU ID, item photo, and serial number. One tap on **Release item** hands it over and marks it `RESOLVED`.

A refresh icon re-pulls the list on demand. If a visitor's item isn't showing up, it means it genuinely isn't ready yet (claim not approved, or already resolved) — the queue is a direct reflection of real system state, not a cache that can go stale.

Every entry shows a **product image** and a clearly labeled **Serial No.** — the item's own ID number, doubling as its inventory identifier. Write it on a physical tag when the item comes in; it's the same number you'll search by later if the pickup ends up going through the walk-in path instead.

---

## 5. Walk-Ins — No Find-X Account Needed

Not everyone who finds or claims something has the app installed, and Find-X handles both directions:

### Logging a walk-in drop-off
Someone hands you an item and has never used Find-X. Instead of turning them away:
1. Open **Log a Walk-in Drop-off**.
2. Take a photo of the item.
3. Give it a title.
4. Enter **one hidden identifying detail** — the same role as the private description on a normal report, used later to verify whoever comes to claim it.
5. Submit. The item is logged with **no finder attached**, gets a serial number immediately, and goes straight to `ACTIVE` — fully browsable and claimable online, even though it's already physically sitting in the office.

### Releasing to a walk-in claimant
Someone comes to collect an item but has no digital claim (they verified ownership with you in person, or found the item through some other means):
1. Open **Release by Serial Number**.
2. Type in the serial number (the ID number, same as what's on the physical tag).
3. Confirm the photo and title match what they're describing.
4. Tap **Mark as picked up** — the item resolves immediately, inventory updated, no online identity check needed.

---

## 6. What Staff *Doesn't* Do Anymore

For context, in case it comes up in training: earlier versions of this system had staff scan an item's own QR tag for intake, and scan a dynamically-generated session QR to identify a claimant for pickup. **Both are gone.** The fixed check-in QR plus the Pending Queue replaced them — faster for staff (no camera fumbling, no session setup), and it degrades better under load, since multiple visitors can check in against the same static QR simultaneously without staff needing to juggle sessions.

---

## Summary: a staff member's day

```
Someone drops something off  →  they scan the fixed QR (or you log it manually for a walk-in)
                              →  it appears in your Pending Queue
                              →  Confirm drop-off  →  READY_FOR_PICKUP

Someone comes to collect     →  they scan the fixed QR (or you search by serial for a walk-in)
                              →  it appears in your Pending Queue
                              →  Release item  →  RESOLVED
```

No scanning, no sessions, no item-tag QR codes — just a queue and two buttons.
