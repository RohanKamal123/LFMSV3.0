"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus, Target } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Card, ConfirmButton, Empty, Field, Modal, PageHeader, Progress } from "@/components/ui";
import { routineCompletion, routinesFor } from "@/lib/selectors";
import { addDays, formatTime, todayKey, weekdayOf, WEEKDAY_SHORT, WEEK_ORDER } from "@/lib/date";
import type { Goal, GoalKind, RoutineItem } from "@/lib/types";

const GOAL_LABEL: Record<GoalKind, string> = {
  WEEKLY: "This week",
  MONTHLY: "This month",
  EXAM: "Before the exam",
};

export default function RoutinesPage() {
  const { state, upsert, remove, update } = useStore();
  const today = todayKey();

  const [routineDraft, setRoutineDraft] = useState<RoutineItem | null>(null);
  const [goalDraft, setGoalDraft] = useState<Goal | null>(null);

  const todaysRoutines = useMemo(() => routinesFor(state, today), [state, today]);
  const checked = new Set(state.routineChecks[today] ?? []);
  const stats = routineCompletion(state, today);

  /** Last 7 days of routine completion, as a simple consistency read-out. */
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(today, -(6 - i));
        const c = routineCompletion(state, d);
        return { date: d, ...c };
      }),
    [state, today],
  );

  const toggle = (id: string) => {
    update((draft) => {
      const list = draft.routineChecks[today] ?? [];
      draft.routineChecks[today] = list.includes(id)
        ? list.filter((x) => x !== id)
        : [...list, id];
    });
  };

  const goals = [...state.goals].sort(
    (a, b) => Number(a.done) - Number(b.done) || (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
  );

  return (
    <div>
      <PageHeader
        title="Routine & goals"
        subtitle="Habits you repeat daily, and the bigger targets you're working towards."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ---- Daily routine ---- */}
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Today&apos;s routine</h2>
              <button
                className="btn btn-ghost !px-2 !py-1 text-xs"
                onClick={() =>
                  setRoutineDraft({ id: uid("r"), title: "", weekdays: [], active: true })
                }
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {stats.total > 0 ? (
              <div className="mb-3">
                <div className="mb-1.5 flex justify-between text-xs font-semibold">
                  <span className="muted">
                    {stats.done} of {stats.total} done
                  </span>
                  <span className="muted">
                    {Math.round((stats.done / stats.total) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(stats.done / stats.total) * 100}
                  color={stats.done === stats.total ? "var(--good)" : "var(--accent)"}
                  height={8}
                />
              </div>
            ) : null}

            {todaysRoutines.length === 0 ? (
              <Empty
                title="No routine for today"
                hint="Build a few small daily habits — they add up more than long one-off sessions."
              />
            ) : (
              <ul className="space-y-1">
                {todaysRoutines.map((r) => {
                  const done = checked.has(r.id);
                  return (
                    <li key={r.id} className="flex items-center gap-2">
                      <button
                        onClick={() => toggle(r.id)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:opacity-80"
                      >
                        {done ? (
                          <CheckCircle2 size={18} className="shrink-0" style={{ color: "var(--good)" }} />
                        ) : (
                          <Circle size={18} className="muted shrink-0" />
                        )}
                        <span className={`truncate ${done ? "muted line-through" : ""}`}>
                          {r.title}
                        </span>
                        {r.time ? (
                          <span className="muted ml-auto shrink-0 text-xs">{formatTime(r.time)}</span>
                        ) : null}
                      </button>
                      <button
                        className="muted shrink-0 px-1 text-xs hover:underline"
                        onClick={() => setRoutineDraft({ ...r })}
                      >
                        Edit
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-bold">Last 7 days</h2>
            <div className="flex gap-1.5">
              {week.map((d) => {
                const pct = d.total ? (d.done / d.total) * 100 : 0;
                return (
                  <div key={d.date} className="flex-1 text-center">
                    <div
                      className="mx-auto flex h-12 w-full items-end overflow-hidden rounded-lg"
                      style={{ background: "var(--surface-2)" }}
                      title={`${d.done}/${d.total}`}
                    >
                      <div
                        className="w-full rounded-lg transition-all"
                        style={{
                          height: `${pct}%`,
                          background: pct === 100 ? "var(--good)" : "var(--accent)",
                        }}
                      />
                    </div>
                    <div className="muted mt-1 text-[10px]">
                      {WEEKDAY_SHORT[weekdayOf(d.date)].slice(0, 1)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {state.routines.filter((r) => !r.active).length > 0 ? (
            <Card>
              <h2 className="muted mb-2 text-xs font-bold uppercase">Paused habits</h2>
              <ul className="space-y-1">
                {state.routines
                  .filter((r) => !r.active)
                  .map((r) => (
                    <li key={r.id}>
                      <button
                        className="muted w-full rounded-lg px-2 py-1.5 text-left text-sm hover:underline"
                        onClick={() => setRoutineDraft({ ...r })}
                      >
                        {r.title}
                      </button>
                    </li>
                  ))}
              </ul>
            </Card>
          ) : null}
        </div>

        {/* ---- Goals ---- */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Goals</h2>
            <button
              className="btn btn-ghost !px-2 !py-1 text-xs"
              onClick={() =>
                setGoalDraft({ id: uid("g"), title: "", kind: "WEEKLY", done: false })
              }
            >
              <Plus size={13} /> Add
            </button>
          </div>

          {goals.length === 0 ? (
            <Empty
              title="No goals set"
              hint="Something concrete beats something vague: “finish Physics ch. 1–4” works better than “study more”."
            />
          ) : (
            <ul className="space-y-2.5">
              {goals.map((g) => {
                const pct =
                  g.target && g.target > 0
                    ? Math.min(100, Math.round(((g.progress ?? 0) / g.target) * 100))
                    : g.done
                      ? 100
                      : 0;
                return (
                  <li
                    key={g.id}
                    className="rounded-xl px-3 py-2.5"
                    style={{ background: "var(--surface-2)", opacity: g.done ? 0.6 : 1 }}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        className="mt-0.5 shrink-0"
                        onClick={() => upsert("goals", { ...g, done: !g.done })}
                      >
                        {g.done ? (
                          <CheckCircle2 size={17} style={{ color: "var(--good)" }} />
                        ) : (
                          <Target size={17} className="muted" />
                        )}
                      </button>
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setGoalDraft({ ...g })}
                      >
                        <span className={`block text-sm font-semibold ${g.done ? "line-through" : ""}`}>
                          {g.title}
                        </span>
                        <span className="muted text-xs">
                          {GOAL_LABEL[g.kind]}
                          {g.dueDate ? ` · by ${g.dueDate}` : ""}
                        </span>
                        {g.detail ? <span className="muted block text-xs">{g.detail}</span> : null}
                      </button>
                    </div>

                    {g.target && g.target > 0 ? (
                      <div className="mt-2">
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="muted">
                            {g.progress ?? 0} / {g.target} {g.unit ?? ""}
                          </span>
                          <span className="flex gap-1">
                            <button
                              className="chip !px-2"
                              onClick={() =>
                                upsert("goals", {
                                  ...g,
                                  progress: Math.max(0, (g.progress ?? 0) - 1),
                                })
                              }
                            >
                              −
                            </button>
                            <button
                              className="chip !px-2"
                              onClick={() => {
                                const next = (g.progress ?? 0) + 1;
                                upsert("goals", {
                                  ...g,
                                  progress: next,
                                  done: next >= (g.target ?? 0) ? true : g.done,
                                });
                              }}
                            >
                              +
                            </button>
                          </span>
                        </div>
                        <Progress value={pct} height={6} color={pct >= 100 ? "var(--good)" : undefined} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* ---- Routine editor ---- */}
      <Modal
        open={routineDraft !== null}
        onClose={() => setRoutineDraft(null)}
        title={state.routines.some((r) => r.id === routineDraft?.id) ? "Edit habit" : "Add habit"}
      >
        {routineDraft ? (
          <div className="space-y-3">
            <Field label="Habit">
              <input
                className="input"
                autoFocus
                value={routineDraft.title}
                placeholder="e.g. Revise yesterday's class for 20 min"
                onChange={(e) => setRoutineDraft({ ...routineDraft, title: e.target.value })}
              />
            </Field>
            <Field label="Time of day" hint="Optional — just for ordering the list.">
              <input
                className="input"
                type="time"
                value={routineDraft.time ?? ""}
                onChange={(e) => setRoutineDraft({ ...routineDraft, time: e.target.value || undefined })}
              />
            </Field>
            <Field label="Days" hint="Pick none for every day.">
              <div className="flex flex-wrap gap-1.5">
                {WEEK_ORDER.map((wd) => {
                  const on = routineDraft.weekdays.includes(wd);
                  return (
                    <button
                      key={wd}
                      type="button"
                      className="chip"
                      style={
                        on
                          ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                          : { color: "var(--text)" }
                      }
                      onClick={() =>
                        setRoutineDraft({
                          ...routineDraft,
                          weekdays: on
                            ? routineDraft.weekdays.filter((x) => x !== wd)
                            : [...routineDraft.weekdays, wd],
                        })
                      }
                    >
                      {WEEKDAY_SHORT[wd]}
                    </button>
                  );
                })}
              </div>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={routineDraft.active}
                onChange={(e) => setRoutineDraft({ ...routineDraft, active: e.target.checked })}
              />
              Active
            </label>
            <div className="flex justify-between gap-2 pt-1">
              {state.routines.some((r) => r.id === routineDraft.id) ? (
                <ConfirmButton
                  className="btn btn-danger"
                  onConfirm={() => {
                    remove("routines", routineDraft.id);
                    setRoutineDraft(null);
                  }}
                >
                  Delete
                </ConfirmButton>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setRoutineDraft(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!routineDraft.title.trim()}
                  onClick={() => {
                    upsert("routines", { ...routineDraft, title: routineDraft.title.trim() });
                    setRoutineDraft(null);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ---- Goal editor ---- */}
      <Modal
        open={goalDraft !== null}
        onClose={() => setGoalDraft(null)}
        title={state.goals.some((g) => g.id === goalDraft?.id) ? "Edit goal" : "Add goal"}
      >
        {goalDraft ? (
          <div className="space-y-3">
            <Field label="Goal">
              <input
                className="input"
                autoFocus
                value={goalDraft.title}
                placeholder="e.g. Finish Physics chapters 1–4"
                onChange={(e) => setGoalDraft({ ...goalDraft, title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Timeframe">
                <select
                  className="input"
                  value={goalDraft.kind}
                  onChange={(e) => setGoalDraft({ ...goalDraft, kind: e.target.value as GoalKind })}
                >
                  {Object.entries(GOAL_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Deadline">
                <input
                  className="input"
                  type="date"
                  value={goalDraft.dueDate ?? ""}
                  onChange={(e) => setGoalDraft({ ...goalDraft, dueDate: e.target.value || undefined })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Target number" hint="Optional, e.g. 4">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={goalDraft.target ?? ""}
                  onChange={(e) =>
                    setGoalDraft({
                      ...goalDraft,
                      target: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Unit" hint="e.g. chapters, hours">
                <input
                  className="input"
                  value={goalDraft.unit ?? ""}
                  onChange={(e) => setGoalDraft({ ...goalDraft, unit: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Details">
              <textarea
                className="input"
                rows={2}
                value={goalDraft.detail ?? ""}
                onChange={(e) => setGoalDraft({ ...goalDraft, detail: e.target.value })}
              />
            </Field>
            <div className="flex justify-between gap-2 pt-1">
              {state.goals.some((g) => g.id === goalDraft.id) ? (
                <ConfirmButton
                  className="btn btn-danger"
                  onConfirm={() => {
                    remove("goals", goalDraft.id);
                    setGoalDraft(null);
                  }}
                >
                  Delete
                </ConfirmButton>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setGoalDraft(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!goalDraft.title.trim()}
                  onClick={() => {
                    upsert("goals", { ...goalDraft, title: goalDraft.title.trim() });
                    setGoalDraft(null);
                  }}
                >
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
