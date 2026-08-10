/**
 * All dates in this app are handled as plain "YYYY-MM-DD" strings in the
 * user's own local timezone. We deliberately never round-trip a calendar day
 * through `Date.toISOString()`, because that shifts to UTC and can land the
 * day before for anyone east of Greenwich - which is exactly where she is.
 */

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Bangladeshi school week runs Saturday -> Friday, with Friday the day off. */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function monthKey(key: string): string {
  return key.slice(0, 7);
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function weekdayOf(key: string): number {
  return fromKey(key).getDay();
}

/** Whole days from `from` to `to`; negative when `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  const a = fromKey(from).getTime();
  const b = fromKey(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** The Saturday that starts the week containing `key`. */
export function startOfWeek(key: string): string {
  const d = fromKey(key);
  const shift = (d.getDay() + 1) % 7; // Saturday -> 0
  return addDays(key, -shift);
}

export function weekKeys(anchor: string): string[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Every day of the month containing `key`, padded to full weeks (Sat-Fri). */
export function calendarGrid(key: string): string[] {
  const d = fromKey(key);
  const first = toKey(new Date(d.getFullYear(), d.getMonth(), 1));
  const last = toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const start = startOfWeek(first);
  const cells: string[] = [];
  let cursor = start;
  while (cursor <= last || cells.length % 7 !== 0) {
    cells.push(cursor);
    cursor = addDays(cursor, 1);
    if (cells.length > 42) break;
  }
  return cells;
}

export function formatDay(key: string): string {
  return fromKey(key).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatLongDay(key: string): string {
  return fromKey(key).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMonth(key: string): string {
  return fromKey(`${monthKey(key)}-01`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(key: string, n: number): string {
  const d = fromKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

/** "17:30" -> "5:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}

export function minutesBetweenTimes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function currentMonthKey(): string {
  return todayKey().slice(0, 7);
}

export function shiftMonthKey(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return toKey(d).slice(0, 7);
}

export function formatMonthKey(ym: string): string {
  return fromKey(`${ym}-01`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
