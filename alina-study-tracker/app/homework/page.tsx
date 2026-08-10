"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Card, ConfirmButton, Dot, Empty, Field, Modal, PageHeader } from "@/components/ui";
import { openHomework, subjectColor } from "@/lib/selectors";
import { todayKey, addDays, formatDay } from "@/lib/date";
import type { Homework } from "@/lib/types";

type Filter = "OPEN" | "DONE" | "ALL";

function blank(): Homework {
  return {
    id: uid("hw"),
    title: "",
    priority: "NORMAL",
    done: false,
    dueDate: todayKey(),
    subjectId: null,
    teacherId: null,
  };
}

export default function HomeworkPage() {
  const { state, upsert, remove, update } = useStore();
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [draft, setDraft] = useState<Homework | null>(null);

  const today = todayKey();
  const tomorrow = addDays(today, 1);

  const rows = useMemo(() => {
    if (filter === "OPEN") return openHomework(state);
    if (filter === "DONE")
      return state.homework
        .filter((h) => h.done)
        .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
    return [...state.homework].sort((a, b) => Number(a.done) - Number(b.done));
  }, [state, filter]);

  const groups = useMemo(() => {
    if (filter !== "OPEN") return [{ label: "", items: rows }];
    const overdue = rows.filter((h) => h.dueDate && h.dueDate < today);
    const dueToday = rows.filter((h) => h.dueDate === today);
    const dueTomorrow = rows.filter((h) => h.dueDate === tomorrow);
    const later = rows.filter((h) => h.dueDate && h.dueDate > tomorrow);
    const noDate = rows.filter((h) => !h.dueDate);
    return [
      { label: "Overdue", items: overdue },
      { label: "Due today", items: dueToday },
      { label: "Due tomorrow", items: dueTomorrow },
      { label: "Later", items: later },
      { label: "No due date", items: noDate },
    ].filter((g) => g.items.length > 0);
  }, [rows, filter, today, tomorrow]);

  const toggle = (id: string) => {
    update((draftState) => {
      const h = draftState.homework.find((x) => x.id === id);
      if (h) {
        h.done = !h.done;
        h.doneAt = h.done ? new Date().toISOString() : undefined;
      }
    });
  };

  const openCount = state.homework.filter((h) => !h.done).length;

  return (
    <div>
      <PageHeader
        title="Homework"
        subtitle={
          openCount > 0
            ? `${openCount} still to do. Homework you note down in a class log shows up here automatically.`
            : "Homework you note down in a class log shows up here automatically."
        }
        action={
          <button className="btn btn-primary" onClick={() => setDraft(blank())}>
            <Plus size={16} /> Add
          </button>
        }
      />

      <div className="mb-4 flex gap-1.5">
        {(["OPEN", "DONE", "ALL"] as Filter[]).map((f) => (
          <button
            key={f}
            className="chip"
            style={
              filter === f
                ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                : { color: "var(--text)" }
            }
            onClick={() => setFilter(f)}
          >
            {f === "OPEN" ? "To do" : f === "DONE" ? "Done" : "All"}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty
          title={filter === "OPEN" ? "Nothing pending" : "Nothing here"}
          hint={
            filter === "OPEN"
              ? "All caught up. Add a task, or note homework while logging a class in the calendar."
              : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.label ? (
                <h2
                  className="muted mb-2 text-xs font-bold uppercase tracking-wide"
                  style={g.label === "Overdue" ? { color: "var(--bad)" } : undefined}
                >
                  {g.label} ({g.items.length})
                </h2>
              ) : null}
              <div className="space-y-1.5">
                {g.items.map((h) => (
                  <Card key={h.id} className="!py-2.5 !px-3">
                    <div className="flex items-start gap-2.5">
                      <button onClick={() => toggle(h.id)} className="mt-0.5 shrink-0">
                        {h.done ? (
                          <CheckCircle2 size={18} style={{ color: "var(--good)" }} />
                        ) : (
                          <Circle size={18} className="muted" />
                        )}
                      </button>
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setDraft({ ...h })}
                      >
                        <span className={`block text-sm ${h.done ? "muted line-through" : ""}`}>
                          {h.title}
                        </span>
                        <span className="muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                          {h.subjectId ? (
                            <span className="inline-flex items-center gap-1">
                              <Dot color={subjectColor(state, h.subjectId)} />
                              {state.subjects.find((s) => s.id === h.subjectId)?.name}
                            </span>
                          ) : null}
                          {h.teacherId ? (
                            <span>{state.teachers.find((t) => t.id === h.teacherId)?.name}</span>
                          ) : null}
                          {h.dueDate ? (
                            <span
                              style={
                                !h.done && h.dueDate < today ? { color: "var(--bad)" } : undefined
                              }
                            >
                              {formatDay(h.dueDate)}
                            </span>
                          ) : null}
                        </span>
                      </button>
                      {h.priority === "HIGH" && !h.done ? (
                        <span className="chip" style={{ color: "var(--bad)" }}>
                          High
                        </span>
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={state.homework.some((h) => h.id === draft?.id) ? "Edit task" : "Add homework"}
      >
        {draft ? (
          <div className="space-y-3">
            <Field label="Task">
              <input
                className="input"
                autoFocus
                value={draft.title}
                placeholder="e.g. Math exercise 5.2, questions 1–15"
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Subject">
                <select
                  className="input"
                  value={draft.subjectId ?? ""}
                  onChange={(e) => setDraft({ ...draft, subjectId: e.target.value || null })}
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
              <Field label="Given by">
                <select
                  className="input"
                  value={draft.teacherId ?? ""}
                  onChange={(e) => setDraft({ ...draft, teacherId: e.target.value || null })}
                >
                  <option value="">Nobody / self</option>
                  {state.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Due date">
                <input
                  className="input"
                  type="date"
                  value={draft.dueDate ?? ""}
                  onChange={(e) => setDraft({ ...draft, dueDate: e.target.value || undefined })}
                />
              </Field>
              <Field label="Priority">
                <select
                  className="input"
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft({ ...draft, priority: e.target.value as Homework["priority"] })
                  }
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                </select>
              </Field>
            </div>
            <Field label="Details">
              <textarea
                className="input"
                rows={3}
                value={draft.detail ?? ""}
                onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
              />
            </Field>
            <div className="flex justify-between gap-2 pt-1">
              {state.homework.some((h) => h.id === draft.id) ? (
                <ConfirmButton
                  className="btn btn-danger"
                  onConfirm={() => {
                    remove("homework", draft.id);
                    setDraft(null);
                  }}
                >
                  Delete
                </ConfirmButton>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setDraft(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!draft.title.trim()}
                  onClick={() => {
                    upsert("homework", { ...draft, title: draft.title.trim() });
                    setDraft(null);
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
