"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Card, ConfirmButton, Dot, Field, Modal, PageHeader } from "@/components/ui";
import { classesOn, plansOn, logsOn, subjectColor } from "@/lib/selectors";
import {
  calendarGrid,
  formatLongDay,
  formatMonth,
  formatTime,
  monthKey,
  shiftMonth,
  todayKey,
  WEEKDAY_SHORT,
  WEEK_ORDER,
} from "@/lib/date";
import type { ClassStatus, PlanEntry, PlanKind, SessionLog } from "@/lib/types";

const STATUS_LABEL: Record<ClassStatus, string> = {
  HELD: "Held",
  CANCELLED: "Cancelled",
  MISSED: "I missed it",
  RESCHEDULED: "Rescheduled",
};

const PLAN_LABEL: Record<PlanKind, string> = {
  PLAN: "Study plan",
  REVISION: "Revision",
  EXAM: "Exam / test",
  OTHER: "Other",
};

function CalendarInner() {
  const params = useSearchParams();
  const { state, upsert, remove, update } = useStore();

  const initial = params.get("date") ?? todayKey();
  const [selected, setSelected] = useState(initial);
  const [cursor, setCursor] = useState(initial);
  const [planDraft, setPlanDraft] = useState<PlanEntry | null>(null);
  const [logDraft, setLogDraft] = useState<SessionLog | null>(null);

  const grid = useMemo(() => calendarGrid(cursor), [cursor]);
  const activeMonth = monthKey(cursor);
  const today = todayKey();

  const dayClasses = useMemo(() => classesOn(state, selected), [state, selected]);
  const dayPlans = useMemo(() => plansOn(state, selected), [state, selected]);
  const dayLogs = useMemo(() => logsOn(state, selected), [state, selected]);

  /** Subject colour dots to show under each date cell. */
  const marksFor = (date: string): string[] => {
    const colors = new Set<string>();
    classesOn(state, date).forEach((c) =>
      c.slot.subjectIds.forEach((sid) => colors.add(subjectColor(state, sid))),
    );
    state.plans
      .filter((p) => p.date === date)
      .forEach((p) => colors.add(subjectColor(state, p.subjectId)));
    return [...colors].slice(0, 4);
  };

  const newPlan = (): PlanEntry => ({
    id: uid("plan"),
    date: selected,
    title: "",
    kind: "PLAN",
    done: false,
    subjectId: null,
  });

  /**
   * Saving a class log also mirrors any homework she was given into the
   * Homework list, so it shows up on the dashboard without double entry. The
   * id is derived from the log id, which keeps re-saves idempotent instead of
   * spawning a duplicate task every time she edits the note.
   */
  const saveLog = (log: SessionLog) => {
    update((draft) => {
      const i = draft.sessionLogs.findIndex((l) => l.id === log.id);
      if (i >= 0) draft.sessionLogs[i] = log;
      else draft.sessionLogs.push(log);

      const hwId = `hw_from_${log.id}`;
      const text = (log.homework ?? "").trim();
      const existing = draft.homework.find((h) => h.id === hwId);

      if (text && log.status === "HELD") {
        if (existing) {
          existing.title = text;
          existing.subjectId = log.subjectId ?? null;
          existing.teacherId = log.teacherId;
        } else {
          draft.homework.push({
            id: hwId,
            title: text,
            subjectId: log.subjectId ?? null,
            teacherId: log.teacherId,
            detail: `From class on ${log.date}`,
            priority: "NORMAL",
            done: false,
          });
        }
      } else if (existing && !existing.done) {
        // Homework note cleared and never actioned - drop the mirrored task.
        draft.homework = draft.homework.filter((h) => h.id !== hwId);
      }
    });
    setLogDraft(null);
  };

  const logForSlot = (slotId: string, teacherId: string, subjectId?: string | null): SessionLog => {
    const existing = state.sessionLogs.find((l) => l.slotId === slotId && l.date === selected);
    if (existing) return { ...existing };
    return {
      id: uid("log"),
      date: selected,
      slotId,
      teacherId,
      subjectId: subjectId ?? null,
      status: "HELD",
    };
  };

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Plan what to study, then come back and record what was actually covered. The gap between the two is the useful part."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Month grid */}
        <Card className="!p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <button
              className="btn btn-ghost !px-2 !py-1"
              onClick={() => setCursor(shiftMonth(cursor, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-sm font-bold">{formatMonth(cursor)}</h2>
            <button
              className="btn btn-ghost !px-2 !py-1"
              onClick={() => setCursor(shiftMonth(cursor, 1))}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEK_ORDER.map((wd) => (
              <div key={wd} className="muted text-center text-[10px] font-bold uppercase">
                {WEEKDAY_SHORT[wd]}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((date) => {
              const inMonth = monthKey(date) === activeMonth;
              const isToday = date === today;
              const isSelected = date === selected;
              const dots = marksFor(date);
              return (
                <button
                  key={date}
                  onClick={() => setSelected(date)}
                  className="flex aspect-square flex-col items-center justify-start rounded-lg pt-1.5 text-xs transition-colors"
                  style={{
                    background: isSelected ? "var(--accent)" : isToday ? "var(--accent-soft)" : "transparent",
                    color: isSelected ? "#fff" : inMonth ? "var(--text)" : "var(--muted)",
                    opacity: inMonth ? 1 : 0.4,
                    fontWeight: isToday || isSelected ? 700 : 400,
                  }}
                >
                  {Number(date.slice(8))}
                  <span className="mt-1 flex gap-0.5">
                    {dots.map((c, i) => (
                      <span
                        key={i}
                        className="h-1 w-1 rounded-full"
                        style={{ background: isSelected ? "#fff" : c }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            className="btn btn-ghost mt-3 w-full text-xs"
            onClick={() => {
              setCursor(today);
              setSelected(today);
            }}
          >
            Jump to today
          </button>
        </Card>

        {/* Day detail */}
        <div className="space-y-4">
          <div>
            <h2 className="font-bold">{formatLongDay(selected)}</h2>
            <p className="muted text-xs">
              {dayClasses.length} {dayClasses.length === 1 ? "class" : "classes"} · {dayPlans.length}{" "}
              planned {dayPlans.length === 1 ? "item" : "items"}
            </p>
          </div>

          {/* Classes on this day */}
          <Card>
            <h3 className="mb-2.5 text-sm font-bold">Classes</h3>
            {dayClasses.length === 0 ? (
              <p className="muted py-2 text-sm">No class scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {dayClasses.map(({ slot, teacher }) => {
                  const log = state.sessionLogs.find(
                    (l) => l.slotId === slot.id && l.date === selected,
                  );
                  return (
                    <li key={slot.id}>
                      <button
                        className="w-full rounded-xl px-3 py-2.5 text-left"
                        style={{ background: "var(--surface-2)" }}
                        onClick={() =>
                          setLogDraft(
                            logForSlot(slot.id, slot.teacherId, slot.subjectIds[0] ?? null),
                          )
                        }
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold">{teacher?.name}</span>
                          <span className="muted text-[11px]">
                            {formatTime(slot.start)}–{formatTime(slot.end)}
                          </span>
                        </div>
                        <div className="muted mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                          {slot.subjectIds.map((sid) => (
                            <span key={sid} className="inline-flex items-center gap-1">
                              <Dot color={subjectColor(state, sid)} />
                              {state.subjects.find((s) => s.id === sid)?.name}
                            </span>
                          ))}
                        </div>
                        {log ? (
                          <div className="mt-2 space-y-0.5 text-xs">
                            <div className="chip" style={{ color: "var(--text)" }}>
                              {STATUS_LABEL[log.status]}
                            </div>
                            {log.covered ? (
                              <p className="mt-1.5">
                                <span className="muted font-semibold">Covered: </span>
                                {log.covered}
                              </p>
                            ) : null}
                            {log.homework ? (
                              <p>
                                <span className="muted font-semibold">Homework: </span>
                                {log.homework}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="muted mt-1.5 text-xs italic">Tap to record what happened</p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Study plan */}
          <Card>
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Study plan</h3>
              <button
                className="btn btn-ghost !px-2 !py-1 text-xs"
                onClick={() => setPlanDraft(newPlan())}
              >
                <Plus size={13} /> Add
              </button>
            </div>
            {dayPlans.length === 0 ? (
              <p className="muted py-2 text-sm">
                Nothing planned for this day yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {dayPlans.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start gap-2 rounded-lg px-2.5 py-2"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={p.done}
                      onChange={() => upsert("plans", { ...p, done: !p.done })}
                    />
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setPlanDraft({ ...p })}
                    >
                      <span className={`block text-sm ${p.done ? "muted line-through" : ""}`}>
                        {p.title}
                      </span>
                      <span className="muted flex flex-wrap items-center gap-1.5 text-[11px]">
                        {p.subjectId ? (
                          <span className="inline-flex items-center gap-1">
                            <Dot color={subjectColor(state, p.subjectId)} />
                            {state.subjects.find((s) => s.id === p.subjectId)?.name}
                          </span>
                        ) : null}
                        <span>{PLAN_LABEL[p.kind]}</span>
                      </span>
                      {p.detail ? <span className="muted block text-[11px]">{p.detail}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Any logs not tied to a slot (e.g. an extra class) */}
          {dayLogs.filter((l) => !l.slotId).length > 0 ? (
            <Card>
              <h3 className="mb-2.5 text-sm font-bold">Extra sessions</h3>
              <ul className="space-y-1.5">
                {dayLogs
                  .filter((l) => !l.slotId)
                  .map((l) => (
                    <li key={l.id}>
                      <button
                        className="w-full rounded-lg px-2.5 py-2 text-left text-sm"
                        style={{ background: "var(--surface-2)" }}
                        onClick={() => setLogDraft({ ...l })}
                      >
                        <span className="font-semibold">
                          {state.teachers.find((t) => t.id === l.teacherId)?.name ?? "Session"}
                        </span>
                        {l.covered ? <span className="muted block text-xs">{l.covered}</span> : null}
                      </button>
                    </li>
                  ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>

      {/* ---- Plan editor ---- */}
      <Modal
        open={planDraft !== null}
        onClose={() => setPlanDraft(null)}
        title={state.plans.some((p) => p.id === planDraft?.id) ? "Edit plan item" : "Add to study plan"}
      >
        {planDraft ? (
          <div className="space-y-3">
            <Field label="What will you study?">
              <input
                className="input"
                autoFocus
                value={planDraft.title}
                placeholder="e.g. Physics ch. 3 — solve all math problems"
                onChange={(e) => setPlanDraft({ ...planDraft, title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Subject">
                <select
                  className="input"
                  value={planDraft.subjectId ?? ""}
                  onChange={(e) =>
                    setPlanDraft({ ...planDraft, subjectId: e.target.value || null })
                  }
                >
                  <option value="">General</option>
                  {state.subjects
                    .filter((s) => !s.archived)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Type">
                <select
                  className="input"
                  value={planDraft.kind}
                  onChange={(e) =>
                    setPlanDraft({ ...planDraft, kind: e.target.value as PlanKind })
                  }
                >
                  {Object.entries(PLAN_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Date">
              <input
                className="input"
                type="date"
                value={planDraft.date}
                onChange={(e) => setPlanDraft({ ...planDraft, date: e.target.value })}
              />
            </Field>
            <Field label="Details">
              <textarea
                className="input"
                rows={3}
                value={planDraft.detail ?? ""}
                placeholder="Page numbers, exercise numbers, anything specific"
                onChange={(e) => setPlanDraft({ ...planDraft, detail: e.target.value })}
              />
            </Field>
            <div className="flex justify-between gap-2 pt-1">
              {state.plans.some((p) => p.id === planDraft.id) ? (
                <ConfirmButton
                  className="btn btn-danger"
                  onConfirm={() => {
                    remove("plans", planDraft.id);
                    setPlanDraft(null);
                  }}
                >
                  Delete
                </ConfirmButton>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setPlanDraft(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!planDraft.title.trim()}
                  onClick={() => {
                    upsert("plans", { ...planDraft, title: planDraft.title.trim() });
                    setSelected(planDraft.date);
                    setPlanDraft(null);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ---- Class log editor ---- */}
      <Modal
        open={logDraft !== null}
        onClose={() => setLogDraft(null)}
        title="What happened in this class?"
        wide
      >
        {logDraft ? (
          <div className="space-y-3">
            <Field label="Status">
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(STATUS_LABEL) as ClassStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    style={
                      logDraft.status === s
                        ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                        : { color: "var(--text)" }
                    }
                    onClick={() => setLogDraft({ ...logDraft, status: s })}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Subject">
              <select
                className="input"
                value={logDraft.subjectId ?? ""}
                onChange={(e) => setLogDraft({ ...logDraft, subjectId: e.target.value || null })}
              >
                <option value="">Not specific</option>
                {state.subjects
                  .filter((s) => !s.archived)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>

            {logDraft.status === "HELD" ? (
              <>
                <Field label="What was actually covered?">
                  <textarea
                    className="input"
                    rows={3}
                    autoFocus
                    value={logDraft.covered ?? ""}
                    placeholder="e.g. Finished Newton's 2nd law, did 6 problems from ch.3"
                    onChange={(e) => setLogDraft({ ...logDraft, covered: e.target.value })}
                  />
                </Field>

                <Field label="Homework given" hint="Saving this also creates a homework task.">
                  <textarea
                    className="input"
                    rows={2}
                    value={logDraft.homework ?? ""}
                    placeholder="e.g. Exercise 3.4, questions 1–10"
                    onChange={(e) => setLogDraft({ ...logDraft, homework: e.target.value })}
                  />
                </Field>

                <Field label="How well did you follow it?">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="chip"
                        style={
                          logDraft.understanding === n
                            ? {
                                background: "var(--accent)",
                                color: "#fff",
                                borderColor: "var(--accent)",
                              }
                            : { color: "var(--text)" }
                        }
                        onClick={() => setLogDraft({ ...logDraft, understanding: n })}
                      >
                        {n}
                      </button>
                    ))}
                    <span className="muted self-center text-xs">1 = lost, 5 = crystal clear</span>
                  </div>
                </Field>

                <Field label="Chapters touched">
                  <div className="max-h-40 overflow-y-auto rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
                    {state.chapters
                      .filter((c) => !logDraft.subjectId || c.subjectId === logDraft.subjectId)
                      .map((c) => {
                        const on = (logDraft.chapterIds ?? []).includes(c.id);
                        return (
                          <label key={c.id} className="flex cursor-pointer items-center gap-2 py-1 text-xs">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() =>
                                setLogDraft({
                                  ...logDraft,
                                  chapterIds: on
                                    ? (logDraft.chapterIds ?? []).filter((x) => x !== c.id)
                                    : [...(logDraft.chapterIds ?? []), c.id],
                                })
                              }
                            />
                            <span className="truncate">
                              {c.number}. {c.name}
                            </span>
                          </label>
                        );
                      })}
                    {state.chapters.length === 0 ? (
                      <p className="muted text-xs">No chapters yet — add subjects in Settings.</p>
                    ) : null}
                  </div>
                </Field>
              </>
            ) : null}

            <Field label="Notes">
              <textarea
                className="input"
                rows={2}
                value={logDraft.notes ?? ""}
                onChange={(e) => setLogDraft({ ...logDraft, notes: e.target.value })}
              />
            </Field>

            <div className="flex justify-between gap-2 pt-1">
              {state.sessionLogs.some((l) => l.id === logDraft.id) ? (
                <ConfirmButton
                  className="btn btn-danger"
                  onConfirm={() => {
                    remove("sessionLogs", logDraft.id);
                    setLogDraft(null);
                  }}
                >
                  Delete log
                </ConfirmButton>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setLogDraft(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={() => saveLog(logDraft)}>
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="muted py-20 text-center text-sm">Loading…</div>}>
      <CalendarInner />
    </Suspense>
  );
}
