import type { AppState, Chapter, Subject } from "./types";
import { SSC_SUBJECTS, DEFAULT_SUBJECT_NAMES, type SeedSubject } from "./syllabus";

export const STATE_VERSION = 1;

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function subjectFromSeed(seed: SeedSubject): { subject: Subject; chapters: Chapter[] } {
  const subject: Subject = {
    id: uid("sub"),
    name: seed.name,
    nameBn: seed.nameBn,
    color: seed.color,
    fullMarks: seed.fullMarks,
  };
  const chapters: Chapter[] = seed.chapters.map((c, i) => ({
    id: uid("ch"),
    subjectId: subject.id,
    number: i + 1,
    name: c.name,
    nameBn: c.nameBn,
    status: "NOT_STARTED",
    confidence: 0,
  }));
  return { subject, chapters };
}

export function emptyState(): AppState {
  const subjects: Subject[] = [];
  const chapters: Chapter[] = [];

  for (const name of DEFAULT_SUBJECT_NAMES) {
    const seed = SSC_SUBJECTS.find((s) => s.name === name);
    if (!seed) continue;
    const built = subjectFromSeed(seed);
    subjects.push(built.subject);
    chapters.push(...built.chapters);
  }

  return {
    version: STATE_VERSION,
    updatedAt: new Date().toISOString(),
    settings: {
      studentName: "Alina",
      examDate: "2026-12-01",
      dailyStudyMinutesTarget: 180,
      syncCode: null,
      theme: "system",
    },
    subjects,
    teachers: [],
    slots: [],
    sessionLogs: [],
    plans: [],
    chapters,
    homework: [],
    exams: [],
    studySessions: [],
    fees: [],
    routines: [
      { id: uid("r"), title: "Morning revision (30 min)", time: "07:00", weekdays: [], active: true },
      { id: uid("r"), title: "Finish today's class homework", time: "20:00", weekdays: [], active: true },
      { id: uid("r"), title: "Read 1 chapter of English", weekdays: [], active: true },
      { id: uid("r"), title: "Sleep by 11 PM", time: "23:00", weekdays: [], active: true },
    ],
    routineChecks: {},
    goals: [],
  };
}

/**
 * Brings any previously stored blob up to the current shape. Because the whole
 * app state travels as one JSON document, a missing key from an older version
 * would otherwise crash a page - every collection is defaulted here.
 */
export function migrate(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const input = raw as Partial<AppState>;

  const arr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);

  const state: AppState = {
    version: STATE_VERSION,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
    settings: {
      ...base.settings,
      ...(input.settings && typeof input.settings === "object" ? input.settings : {}),
    },
    // A stored file that has been emptied on purpose must stay empty, so we
    // only fall back to the seeded subjects when the key is absent entirely.
    subjects: arr(input.subjects, base.subjects),
    teachers: arr(input.teachers, []),
    slots: arr(input.slots, []),
    sessionLogs: arr(input.sessionLogs, []),
    plans: arr(input.plans, []),
    chapters: arr(input.chapters, input.subjects === undefined ? base.chapters : []),
    homework: arr(input.homework, []),
    exams: arr(input.exams, []),
    studySessions: arr(input.studySessions, []),
    fees: arr(input.fees, []),
    routines: arr(input.routines, []),
    routineChecks:
      input.routineChecks && typeof input.routineChecks === "object" && !Array.isArray(input.routineChecks)
        ? (input.routineChecks as Record<string, string[]>)
        : {},
    goals: arr(input.goals, []),
  };

  // Guard against a corrupted exam date breaking every countdown on the app.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(state.settings.examDate)) {
    state.settings.examDate = base.settings.examDate;
  }
  if (!state.settings.studentName) state.settings.studentName = "Alina";
  if (!Number.isFinite(state.settings.dailyStudyMinutesTarget)) {
    state.settings.dailyStudyMinutesTarget = 180;
  }

  return state;
}
