"use client";

import { useMemo, useState } from "react";
import { Building2, Globe, MapPin, Plus, User } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Card, ConfirmButton, Dot, Empty, Field, Modal, PageHeader } from "@/components/ui";
import { activeTeachers, pastTeachers } from "@/lib/selectors";
import { formatTime, todayKey, WEEKDAY_SHORT } from "@/lib/date";
import type { Teacher, TeacherKind, Mode } from "@/lib/types";

function blank(): Teacher {
  return {
    id: uid("t"),
    name: "",
    kind: "TUTOR",
    mode: "OFFLINE",
    subjectIds: [],
    startedOn: todayKey(),
    endedOn: null,
  };
}

export default function TeachersPage() {
  const { state, upsert, update } = useStore();
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [showPast, setShowPast] = useState(false);

  const current = useMemo(() => activeTeachers(state), [state]);
  const past = useMemo(() => pastTeachers(state), [state]);

  const save = () => {
    if (!editing || !editing.name.trim()) return;
    upsert("teachers", { ...editing, name: editing.name.trim() });
    setEditing(null);
  };

  const stopTeacher = (t: Teacher) => {
    // Closing out rather than deleting keeps her logs, fees and history intact.
    update((draft) => {
      const row = draft.teachers.find((x) => x.id === t.id);
      if (row) row.endedOn = todayKey();
      // Their recurring slots should stop appearing on the schedule too.
      draft.slots.filter((s) => s.teacherId === t.id).forEach((s) => (s.active = false));
    });
  };

  const resumeTeacher = (t: Teacher) => {
    update((draft) => {
      const row = draft.teachers.find((x) => x.id === t.id);
      if (row) row.endedOn = null;
    });
  };

  const deleteTeacher = (t: Teacher) => {
    update((draft) => {
      draft.teachers = draft.teachers.filter((x) => x.id !== t.id);
      draft.slots = draft.slots.filter((s) => s.teacherId !== t.id);
      draft.sessionLogs = draft.sessionLogs.filter((l) => l.teacherId !== t.id);
      draft.fees = draft.fees.filter((f) => f.teacherId !== t.id);
    });
  };

  const renderCard = (t: Teacher, ended: boolean) => {
    const slots = state.slots.filter((s) => s.teacherId === t.id && s.active);
    return (
      <Card key={t.id} className={ended ? "opacity-70" : ""}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              {t.kind === "COACHING" ? <Building2 size={18} /> : <User size={18} />}
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-bold">{t.name}</h3>
              <div className="muted mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="chip">{t.kind === "COACHING" ? "Coaching" : "Tutor"}</span>
                <span className="chip">
                  {t.mode === "ONLINE" ? <Globe size={11} /> : <MapPin size={11} />}
                  {t.mode === "ONLINE" ? "Online" : "Offline"}
                </span>
                {t.fee ? <span className="chip">৳{t.fee}/mo</span> : null}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost !px-2.5 !py-1 text-xs" onClick={() => setEditing({ ...t })}>
            Edit
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {t.subjectIds.length === 0 ? (
            <span className="muted text-xs">No subjects assigned yet</span>
          ) : (
            t.subjectIds.map((sid) => {
              const s = state.subjects.find((x) => x.id === sid);
              if (!s) return null;
              return (
                <span key={sid} className="chip" style={{ color: "var(--text)" }}>
                  <Dot color={s.color} />
                  {s.name}
                </span>
              );
            })
          )}
        </div>

        {slots.length > 0 ? (
          <div className="muted mt-3 text-xs">
            {slots
              .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))
              .map((s) => `${WEEKDAY_SHORT[s.weekday]} ${formatTime(s.start)}`)
              .join(" · ")}
          </div>
        ) : null}

        <div
          className="muted mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs"
          style={{ borderColor: "var(--border)" }}
        >
          <span>
            {ended ? `${t.startedOn} → ${t.endedOn}` : `Since ${t.startedOn}`}
            {t.contact ? ` · ${t.contact}` : ""}
          </span>
          <span className="flex gap-2">
            {ended ? (
              <button className="btn btn-ghost !px-2.5 !py-1 text-xs" onClick={() => resumeTeacher(t)}>
                Resume
              </button>
            ) : (
              <ConfirmButton
                className="btn btn-ghost !px-2.5 !py-1 text-xs"
                confirmLabel="Confirm stop"
                onConfirm={() => stopTeacher(t)}
              >
                Stopped studying
              </ConfirmButton>
            )}
            <ConfirmButton
              className="btn btn-danger !px-2.5 !py-1 text-xs"
              confirmLabel="Delete for good?"
              onConfirm={() => deleteTeacher(t)}
            >
              Delete
            </ConfirmButton>
          </span>
        </div>

        {t.note ? <p className="muted mt-2 text-xs italic">{t.note}</p> : null}
      </Card>
    );
  };

  return (
    <div>
      <PageHeader
        title="Teachers & coaching"
        subtitle="Your line-up changes most months. Use “Stopped studying” instead of Delete so old classes, fees and notes stay in your history."
        action={
          <button className="btn btn-primary" onClick={() => setEditing(blank())}>
            <Plus size={16} /> Add
          </button>
        }
      />

      {current.length === 0 && past.length === 0 ? (
        <Empty
          title="No teachers added yet"
          hint="Add each private tutor and coaching centre, then tell the app which subjects they cover."
          action={
            <button className="btn btn-primary" onClick={() => setEditing(blank())}>
              <Plus size={16} /> Add the first one
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">{current.map((t) => renderCard(t, false))}</div>

          {past.length > 0 ? (
            <div>
              <button
                className="btn btn-ghost mt-2 text-xs"
                onClick={() => setShowPast((v) => !v)}
              >
                {showPast ? "Hide" : "Show"} past teachers ({past.length})
              </button>
              {showPast ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {past.map((t) => renderCard(t, true))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={state.teachers.some((t) => t.id === editing?.id) ? "Edit teacher" : "Add teacher"}
      >
        {editing ? (
          <div className="space-y-3">
            <Field label="Name">
              <input
                className="input"
                autoFocus
                value={editing.name}
                placeholder="e.g. Rafiq Sir, or Uttoron Coaching"
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select
                  className="input"
                  value={editing.kind}
                  onChange={(e) =>
                    setEditing({ ...editing, kind: e.target.value as TeacherKind })
                  }
                >
                  <option value="TUTOR">Private tutor</option>
                  <option value="COACHING">Coaching centre</option>
                </select>
              </Field>
              <Field label="Mode">
                <select
                  className="input"
                  value={editing.mode}
                  onChange={(e) => setEditing({ ...editing, mode: e.target.value as Mode })}
                >
                  <option value="OFFLINE">Offline</option>
                  <option value="ONLINE">Online</option>
                </select>
              </Field>
            </div>

            <div>
              <span className="label">Subjects they teach</span>
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
              <Field label="Monthly fee (৳)">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={editing.fee ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      fee: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Fee due day">
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="e.g. 5"
                  value={editing.feeDueDay ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      feeDueDay: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Started on">
                <input
                  className="input"
                  type="date"
                  value={editing.startedOn}
                  onChange={(e) => setEditing({ ...editing, startedOn: e.target.value })}
                />
              </Field>
              <Field label="Stopped on" hint="Leave empty if ongoing">
                <input
                  className="input"
                  type="date"
                  value={editing.endedOn ?? ""}
                  onChange={(e) => setEditing({ ...editing, endedOn: e.target.value || null })}
                />
              </Field>
            </div>

            <Field label="Contact">
              <input
                className="input"
                value={editing.contact ?? ""}
                placeholder="Phone or WhatsApp"
                onChange={(e) => setEditing({ ...editing, contact: e.target.value })}
              />
            </Field>

            <Field label="Note">
              <textarea
                className="input"
                rows={2}
                value={editing.note ?? ""}
                placeholder="Batch name, address, anything to remember"
                onChange={(e) => setEditing({ ...editing, note: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-1">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={save} disabled={!editing.name.trim()}>
                Save
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
