import type { AppState, ClassSlot, ID, Subject, Teacher } from "./types";
import { addDays, daysBetween, minutesBetweenTimes, todayKey, weekdayOf, weekKeys } from "./date";

export function subjectMap(state: AppState): Map<ID, Subject> {
  return new Map(state.subjects.map((s) => [s.id, s]));
}

export function teacherMap(state: AppState): Map<ID, Teacher> {
  return new Map(state.teachers.map((t) => [t.id, t]));
}

export function subjectName(state: AppState, id?: ID | null): string {
  if (!id) return "General";
  return state.subjects.find((s) => s.id === id)?.name ?? "Unknown subject";
}

export function subjectColor(state: AppState, id?: ID | null): string {
  if (!id) return "#94a3b8";
  return state.subjects.find((s) => s.id === id)?.color ?? "#94a3b8";
}

export function teacherName(state: AppState, id?: ID | null): string {
  if (!id) return "-";
  return state.teachers.find((t) => t.id === id)?.name ?? "Removed teacher";
}

/** Teachers she is currently studying with (not closed out). */
export function activeTeachers(state: AppState): Teacher[] {
  const today = todayKey();
  return state.teachers
    .filter((t) => !t.endedOn || t.endedOn >= today)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function pastTeachers(state: AppState): Teacher[] {
  const today = todayKey();
  return state.teachers
    .filter((t) => t.endedOn && t.endedOn < today)
    .sort((a, b) => (b.endedOn ?? "").localeCompare(a.endedOn ?? ""));
}

export interface DayClass {
  slot: ClassSlot;
  teacher?: Teacher;
  /** The log for this slot on this date, if she has already filled one in. */
  logId?: ID;
}

/** Active slots falling on the weekday of `date`, sorted by start time. */
export function classesOn(state: AppState, date: string): DayClass[] {
  const wd = weekdayOf(date);
  const teachers = teacherMap(state);
  return state.slots
    .filter((s) => s.active && s.weekday === wd)
    .filter((s) => {
      const t = teachers.get(s.teacherId);
      // Hide classes for a teacher she had not started with / has left.
      if (!t) return false;
      if (t.startedOn && date < t.startedOn) return false;
      if (t.endedOn && date > t.endedOn) return false;
      return true;
    })
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((slot) => ({
      slot,
      teacher: teachers.get(slot.teacherId),
      logId: state.sessionLogs.find((l) => l.slotId === slot.id && l.date === date)?.id,
    }));
}

export function plansOn(state: AppState, date: string) {
  return state.plans.filter((p) => p.date === date);
}

export function logsOn(state: AppState, date: string) {
  return state.sessionLogs.filter((l) => l.date === date);
}

export interface SyllabusProgress {
  total: number;
  notStarted: number;
  learning: number;
  done: number;
  revised: number;
  /** DONE + REVISED as a 0-100 percentage. */
  percent: number;
}

export function syllabusProgress(state: AppState, subjectId?: ID): SyllabusProgress {
  const chapters = subjectId
    ? state.chapters.filter((c) => c.subjectId === subjectId)
    : state.chapters.filter((c) => state.subjects.some((s) => s.id === c.subjectId && !s.archived));
  const total = chapters.length;
  const notStarted = chapters.filter((c) => c.status === "NOT_STARTED").length;
  const learning = chapters.filter((c) => c.status === "LEARNING").length;
  const done = chapters.filter((c) => c.status === "DONE").length;
  const revised = chapters.filter((c) => c.status === "REVISED").length;
  return {
    total,
    notStarted,
    learning,
    done,
    revised,
    percent: total === 0 ? 0 : Math.round(((done + revised) / total) * 100),
  };
}

export function daysToExam(state: AppState): number {
  return daysBetween(todayKey(), state.settings.examDate);
}

/**
 * How far through the syllabus she *should* be if she had started the day she
 * began using the app and finished on exam day. Compared against actual
 * progress this is the "are you on pace" signal.
 */
export function pacePercent(state: AppState): number {
  const left = daysToExam(state);
  if (left <= 0) return 100;
  // Assume a 12-month run-up; anything earlier than that counts as day zero.
  const window = 365;
  const elapsed = Math.max(0, window - left);
  return Math.min(100, Math.round((elapsed / window) * 100));
}

export function studyMinutesOn(state: AppState, date: string): number {
  return state.studySessions
    .filter((s) => s.date === date)
    .reduce((sum, s) => sum + (s.minutes || 0), 0);
}

export function studyMinutesInWeek(state: AppState, anchor: string): number {
  return weekKeys(anchor).reduce((sum, d) => sum + studyMinutesOn(state, d), 0);
}

/** Minutes per subject over the last `days` days, biggest first. */
export function studyBySubject(state: AppState, days = 7): { subjectId: ID | null; minutes: number }[] {
  const from = addDays(todayKey(), -(days - 1));
  const totals = new Map<ID | null, number>();
  for (const s of state.studySessions) {
    if (s.date < from) continue;
    const key = s.subjectId ?? null;
    totals.set(key, (totals.get(key) ?? 0) + s.minutes);
  }
  return [...totals.entries()]
    .map(([subjectId, minutes]) => ({ subjectId, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

/**
 * Consecutive days up to today on which she hit at least one study minute.
 * Today not being logged yet does not break the streak - only a missed
 * yesterday does.
 */
export function studyStreak(state: AppState): number {
  const logged = new Set(state.studySessions.filter((s) => s.minutes > 0).map((s) => s.date));
  let streak = 0;
  let cursor = todayKey();
  if (!logged.has(cursor)) cursor = addDays(cursor, -1);
  while (logged.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function routinesFor(state: AppState, date: string) {
  const wd = weekdayOf(date);
  return state.routines
    .filter((r) => r.active)
    .filter((r) => r.weekdays.length === 0 || r.weekdays.includes(wd))
    .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
}

export function routineCompletion(state: AppState, date: string): { done: number; total: number } {
  const list = routinesFor(state, date);
  const checked = new Set(state.routineChecks[date] ?? []);
  return { done: list.filter((r) => checked.has(r.id)).length, total: list.length };
}

export function openHomework(state: AppState) {
  return state.homework
    .filter((h) => !h.done)
    .sort((a, b) => {
      const ad = a.dueDate ?? "9999-99-99";
      const bd = b.dueDate ?? "9999-99-99";
      if (ad !== bd) return ad.localeCompare(bd);
      const rank = { HIGH: 0, NORMAL: 1, LOW: 2 } as const;
      return rank[a.priority] - rank[b.priority];
    });
}

export function overdueHomework(state: AppState) {
  const today = todayKey();
  return openHomework(state).filter((h) => h.dueDate && h.dueDate < today);
}

/** Average percentage across every logged exam for a subject. */
export function subjectAverage(state: AppState, subjectId: ID): number | null {
  const rows = state.exams.filter((e) => e.subjectId === subjectId && e.total > 0);
  if (rows.length === 0) return null;
  const pct = rows.reduce((sum, e) => sum + (e.marks / e.total) * 100, 0) / rows.length;
  return Math.round(pct);
}

export function weeklyClassMinutes(state: AppState): number {
  return state.slots
    .filter((s) => s.active)
    .reduce((sum, s) => sum + Math.max(0, minutesBetweenTimes(s.start, s.end)), 0);
}

/** Fee rows a teacher should have for a month, created lazily by the Fees page. */
export function monthlyFeeTotal(state: AppState, month: string): { due: number; paid: number } {
  const rows = state.fees.filter((f) => f.month === month);
  return {
    due: rows.reduce((s, f) => s + f.amount, 0),
    paid: rows.filter((f) => f.paid).reduce((s, f) => s + f.amount, 0),
  };
}

/**
 * Subjects no current teacher covers - a real gap worth surfacing, since her
 * line-up changes monthly and a dropped tutor can silently orphan a subject.
 * Keyed off teachers rather than slots so a newly added teacher counts before
 * their timetable has been filled in.
 */
export function uncoveredSubjects(state: AppState): Subject[] {
  const covered = new Set<ID>();
  for (const t of activeTeachers(state)) {
    t.subjectIds.forEach((id) => covered.add(id));
  }
  return state.subjects.filter((s) => !s.archived && !covered.has(s.id));
}
