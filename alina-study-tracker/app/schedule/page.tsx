"use client";

import { useMemo, useState } from "react";
import { Plus, Power } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Card, ConfirmButton, Dot, Empty, Field, Modal, PageHeader } from "@/components/ui";
import { activeTeachers, weeklyClassMinutes } from "@/lib/selectors";
import {
  formatDuration,
  formatTime,
  minutesBetweenTimes,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  WEEK_ORDER,
} from "@/lib/date";
import type { ClassSlot, Mode, Teacher } from "@/lib/types";

/** Seeded from the teacher so a new slot already lists what they teach. */
function blank(teacher: Teacher | undefined, weekday = 6): ClassSlot {
  return {
    id: uid("slot"),
    teacherId: teacher?.id ?? "",
    subjectIds: teacher ? [...teacher.subjectIds] : [],
    weekday,
    start: "17:00",
    end: "18:30",
    mode: teacher?.mode,
    active: true,
  };
}

export default function SchedulePage() {
  const { state, upsert, remove } = useStore();
  const [editing, setEditing] = useState<ClassSlot | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const teachers = useMemo(() => activeTeachers(state), [state]);
  const allTeachers = state.teachers;

  const byDay = useMemo(() => {
    const map = new Map<number, ClassSlot[]>();
    for (const wd of WEEK_ORDER) map.set(wd, []);
    for (const s of state.slots) {
      if (!s.active && !showInactive) continue;
      map.get(s.weekday)?.push(s);
    }
    for (const list of map.values()) list.sort((a, b) => a.start.localeCompare(b.start));
    return map;
  }, [state.slots, showInactive]);

  const weeklyMinutes = weeklyClassMinutes(state);

  const save = () => {
    if (!editing) return;
    if (minutesBetweenTimes(editing.start, editing.end) <= 0) return;
    upsert("slots", editing);
    setEditing(null);
  };

  const invalidTime = editing ? minutesBetweenTimes(editing.start, editing.end) <= 0 : false;

  return (
    <div>
      <PageHeader
        title="Weekly schedule"
        subtitle={
          state.slots.some((s) => s.active)
            ? `${formatDuration(weeklyMinutes)} of class time per week across ${
                new Set(state.slots.filter((s) => s.active).map((s) => s.teacherId)).size
              } teachers.`
            : "Add each recurring tuition slot. When a batch changes, switch the old slot off instead of deleting it."
        }
        action={
          <button
            className="btn btn-primary"
            disabled={teachers.length === 0}
            onClick={() => setEditing(blank(teachers[0]))}
          >
            <Plus size={16} /> Add slot
          </button>
        }
      />

      {teachers.length === 0 ? (
        <Empty
          title="Add a teacher first"
          hint="Class slots hang off a teacher or coaching centre, so start on the Teachers page."
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show switched-off slots
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WEEK_ORDER.map((wd) => {
              const slots = byDay.get(wd) ?? [];
              return (
                <Card key={wd} className="!p-3">
                  <div className="mb-2 flex items-baseline justify-between px-1">
                    <h2 className="text-sm font-bold">{WEEKDAY_NAMES[wd]}</h2>
                    <span className="muted text-[11px]">
                      {slots.filter((s) => s.active).length || "—"}
                    </span>
                  </div>

                  {slots.length === 0 ? (
                    <button
                      className="muted w-full rounded-lg border border-dashed py-4 text-xs hover:opacity-70"
                      style={{ borderColor: "var(--border)" }}
                      onClick={() => setEditing(blank(teachers[0], wd))}
                    >
                      + Add class
                    </button>
                  ) : (
                    <ul className="space-y-1.5">
                      {slots.map((s) => {
                        const t = allTeachers.find((x) => x.id === s.teacherId);
                        return (
                          <li
                            key={s.id}
                            className={`rounded-lg px-2.5 py-2 ${s.active ? "" : "opacity-50"}`}
                            style={{ background: "var(--surface-2)" }}
                          >
                            <button
                              className="w-full text-left"
                              onClick={() => setEditing({ ...s })}
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs font-bold">
                                  {formatTime(s.start)} – {formatTime(s.end)}
                                </span>
                                <span className="muted text-[10px]">
                                  {formatDuration(Math.max(0, minutesBetweenTimes(s.start, s.end)))}
                                </span>
                              </div>
                              <div className="mt-0.5 truncate text-xs font-semibold">
                                {t?.name ?? "Removed teacher"}
                              </div>
                              <div className="muted mt-0.5 flex flex-wrap items-center gap-1 text-[10px]">
                                {s.subjectIds.map((sid) => {
                                  const sub = state.subjects.find((x) => x.id === sid);
                                  if (!sub) return null;
                                  return (
                                    <span key={sid} className="inline-flex items-center gap-1">
                                      <Dot color={sub.color} />
                                      {sub.name}
                                    </span>
                                  );
                                })}
                                {s.location ? <span>· {s.location}</span> : null}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={state.slots.some((s) => s.id === editing?.id) ? "Edit class slot" : "Add class slot"}
      >
        {editing ? (
          <div className="space-y-3">
            <Field label="Teacher / coaching">
              <select
                className="input"
                value={editing.teacherId}
                onChange={(e) => {
                  const t = allTeachers.find((x) => x.id === e.target.value);
                  setEditing({
                    ...editing,
                    teacherId: e.target.value,
                    // Pre-fill with what that teacher actually teaches.
                    subjectIds: t ? t.subjectIds : editing.subjectIds,
                    mode: t?.mode ?? editing.mode,
                  });
                }}
              >
                {allTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.endedOn ? " (past)" : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Day">
              <div className="flex flex-wrap gap-1.5">
                {WEEK_ORDER.map((wd) => (
                  <button
                    key={wd}
                    type="button"
                    className="chip"
                    style={
                      editing.weekday === wd
                        ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                        : { color: "var(--text)" }
                    }
                    onClick={() => setEditing({ ...editing, weekday: wd })}
                  >
                    {WEEKDAY_SHORT[wd]}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start">
                <input
                  className="input"
                  type="time"
                  value={editing.start}
                  onChange={(e) => setEditing({ ...editing, start: e.target.value })}
                />
              </Field>
              <Field label="End">
                <input
                  className="input"
                  type="time"
                  value={editing.end}
                  onChange={(e) => setEditing({ ...editing, end: e.target.value })}
                />
              </Field>
            </div>
            {invalidTime ? (
              <p className="text-xs font-semibold" style={{ color: "var(--bad)" }}>
                End time must be after the start time.
              </p>
            ) : null}

            <div>
              <span className="label">Subjects in this class</span>
              <div className="flex flex-wrap gap-1.5">
                {state.subjects
                  .filter((s) => !s.archived)
                  .map((s) => {
                    const on = editing.subjectIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className="chip"
                        style={
                          on
                            ? { background: s.color, color: "#fff", borderColor: s.color }
                            : { color: "var(--text)" }
                        }
                        onClick={() =>
                          setEditing({
                            ...editing,
                            subjectIds: on
                              ? editing.subjectIds.filter((x) => x !== s.id)
                              : [...editing.subjectIds, s.id],
                          })
                        }
                      >
                        {on ? null : <Dot color={s.color} />}
                        {s.name}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Mode">
                <select
                  className="input"
                  value={editing.mode ?? "OFFLINE"}
                  onChange={(e) => setEditing({ ...editing, mode: e.target.value as Mode })}
                >
                  <option value="OFFLINE">Offline</option>
                  <option value="ONLINE">Online</option>
                </select>
              </Field>
              <Field label="Place / link">
                <input
                  className="input"
                  value={editing.location ?? ""}
                  placeholder="Home, centre, Zoom…"
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                />
              </Field>
            </div>

            <div
              className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                className="btn btn-ghost text-xs"
                onClick={() => setEditing({ ...editing, active: !editing.active })}
              >
                <Power size={14} />
                {editing.active ? "Switch off" : "Switch on"}
              </button>
              <div className="flex gap-2">
                {state.slots.some((s) => s.id === editing.id) ? (
                  <ConfirmButton
                    className="btn btn-danger text-xs"
                    onConfirm={() => {
                      remove("slots", editing.id);
                      setEditing(null);
                    }}
                  >
                    Delete
                  </ConfirmButton>
                ) : null}
                <button className="btn btn-primary" onClick={save} disabled={invalidTime}>
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
