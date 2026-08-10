"use client";

import { useRef, useState } from "react";
import { Check, Cloud, Copy, Download, Plus, RotateCcw, Upload } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Card, ConfirmButton, Dot, Field, Modal, PageHeader } from "@/components/ui";
import { downloadJson, newSyncCode, readBackup } from "@/lib/storage";
import { emptyState, migrate, subjectFromSeed } from "@/lib/defaults";
import { SSC_SUBJECTS } from "@/lib/syllabus";
import { todayKey } from "@/lib/date";
import type { Subject } from "@/lib/types";

export default function SettingsPage() {
  const { state, update, upsert, replaceAll, syncNow, syncStatus, cloudConfigured } = useStore();
  const fileInput = useRef<HTMLInputElement>(null);

  const [subjectDraft, setSubjectDraft] = useState<Subject | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const s = state.settings;

  const setSetting = <K extends keyof typeof s>(key: K, value: (typeof s)[K]) => {
    update((draft) => {
      draft.settings[key] = value;
    });
  };

  const missingSeeds = SSC_SUBJECTS.filter(
    (seed) => !state.subjects.some((x) => x.name === seed.name),
  );

  const addSeedSubject = (name: string) => {
    const seed = SSC_SUBJECTS.find((x) => x.name === name);
    if (!seed) return;
    const built = subjectFromSeed(seed);
    update((draft) => {
      draft.subjects.push(built.subject);
      draft.chapters.push(...built.chapters);
    });
  };

  const deleteSubject = (id: string) => {
    update((draft) => {
      draft.subjects = draft.subjects.filter((x) => x.id !== id);
      draft.chapters = draft.chapters.filter((c) => c.subjectId !== id);
      draft.exams = draft.exams.filter((e) => e.subjectId !== id);
      draft.teachers.forEach((t) => {
        t.subjectIds = t.subjectIds.filter((x) => x !== id);
      });
      draft.slots.forEach((sl) => {
        sl.subjectIds = sl.subjectIds.filter((x) => x !== id);
      });
      draft.plans.forEach((p) => {
        if (p.subjectId === id) p.subjectId = null;
      });
      draft.homework.forEach((h) => {
        if (h.subjectId === id) h.subjectId = null;
      });
      draft.studySessions.forEach((ss) => {
        if (ss.subjectId === id) ss.subjectId = null;
      });
    });
  };

  const onImport = async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      replaceAll(migrate(parsed));
    } catch {
      setImportError("That file could not be read. Pick a backup exported from this app.");
    }
  };

  const restoreBackup = () => {
    const backup = readBackup();
    if (backup) replaceAll(backup);
    else setImportError("No previous snapshot found in this browser.");
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" />

      {/* ---- Profile ---- */}
      <Card>
        <h2 className="mb-3 font-bold">Profile & exam</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input
              className="input"
              value={s.studentName}
              onChange={(e) => setSetting("studentName", e.target.value)}
            />
          </Field>
          <Field label="SSC exam start date">
            <input
              className="input"
              type="date"
              value={s.examDate}
              onChange={(e) => setSetting("examDate", e.target.value || todayKey())}
            />
          </Field>
          <Field label="Daily self-study goal (minutes)">
            <input
              className="input"
              type="number"
              min={0}
              step={15}
              value={s.dailyStudyMinutesTarget}
              onChange={(e) => setSetting("dailyStudyMinutesTarget", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Theme">
            <select
              className="input"
              value={s.theme}
              onChange={(e) => setSetting("theme", e.target.value as typeof s.theme)}
            >
              <option value="system">Match my device</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
        </div>
      </Card>

      {/* ---- Subjects ---- */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Subjects</h2>
          <button
            className="btn btn-ghost !px-2 !py-1 text-xs"
            onClick={() =>
              setSubjectDraft({ id: uid("sub"), name: "", color: "#6366f1", fullMarks: 100 })
            }
          >
            <Plus size={13} /> Custom
          </button>
        </div>

        <ul className="space-y-1.5">
          {state.subjects.map((sub) => (
            <li
              key={sub.id}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
              style={{ background: "var(--surface-2)" }}
            >
              <Dot color={sub.color} />
              <button className="min-w-0 flex-1 text-left" onClick={() => setSubjectDraft({ ...sub })}>
                <span className="block truncate text-sm font-semibold">{sub.name}</span>
                <span className="muted block truncate text-xs">
                  {sub.nameBn ? `${sub.nameBn} · ` : ""}
                  {state.chapters.filter((c) => c.subjectId === sub.id).length} chapters
                </span>
              </button>
              <ConfirmButton
                className="btn btn-danger !px-2 !py-1 text-xs"
                confirmLabel="Delete?"
                onConfirm={() => deleteSubject(sub.id)}
              >
                Remove
              </ConfirmButton>
            </li>
          ))}
        </ul>

        {missingSeeds.length > 0 ? (
          <div className="mt-4">
            <p className="label">Add a standard SSC subject</p>
            <div className="flex flex-wrap gap-1.5">
              {missingSeeds.map((seed) => (
                <button
                  key={seed.name}
                  className="chip"
                  style={{ color: "var(--text)" }}
                  onClick={() => addSeedSubject(seed.name)}
                >
                  <Plus size={11} /> {seed.name}
                </button>
              ))}
            </div>
            <p className="muted mt-2 text-xs">
              Chapter lists come from the NCTB syllabus and are a starting point — check them
              against your own books and edit anything that differs.
            </p>
          </div>
        ) : null}
      </Card>

      {/* ---- Sync ---- */}
      <Card>
        <h2 className="mb-1 font-bold">Cloud sync</h2>
        <p className="muted mb-3 text-sm">
          {cloudConfigured
            ? "Turn this on to use the same data on your phone and laptop."
            : "Not configured for this deployment. Everything is saved in this browser only — see the README for how to switch Supabase on."}
        </p>

        {cloudConfigured ? (
          s.syncCode ? (
            <div className="space-y-3">
              <Field
                label="Your sync code"
                hint="Anyone with this code can read and change your data. Keep it private."
              >
                <div className="flex gap-2">
                  <input className="input font-mono text-xs" readOnly value={s.syncCode} />
                  <button
                    className="btn btn-ghost shrink-0"
                    onClick={() => {
                      navigator.clipboard?.writeText(s.syncCode ?? "");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    }}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>
              </Field>
              <p className="muted text-xs">
                On another device: open this site, choose <strong>Use an existing code</strong> and
                paste it in.
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={() => syncNow()}>
                  <Cloud size={15} /> Sync now
                </button>
                <ConfirmButton
                  className="btn btn-ghost"
                  confirmLabel="Disconnect?"
                  onConfirm={() => setSetting("syncCode", null)}
                >
                  Turn off sync
                </ConfirmButton>
              </div>
              {syncStatus.kind === "error" ? (
                <p className="text-xs" style={{ color: "var(--bad)" }}>
                  {syncStatus.message}
                </p>
              ) : syncStatus.kind === "idle" && syncStatus.at ? (
                <p className="muted text-xs">
                  Last synced {new Date(syncStatus.at).toLocaleString()}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <button className="btn btn-primary" onClick={() => setSetting("syncCode", newSyncCode())}>
                <Cloud size={15} /> Turn on sync for this device
              </button>
              <Field label="…or use an existing code from another device">
                <div className="flex gap-2">
                  <input
                    className="input font-mono text-xs"
                    placeholder="paste sync code"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.trim())}
                  />
                  <button
                    className="btn btn-ghost shrink-0"
                    disabled={codeInput.length < 8}
                    onClick={() => {
                      setSetting("syncCode", codeInput);
                      setCodeInput("");
                      // The provider pulls on mount; force one immediately.
                      setTimeout(() => syncNow(), 100);
                    }}
                  >
                    Connect
                  </button>
                </div>
              </Field>
              <p className="muted text-xs">
                Connecting pulls whichever copy was edited most recently. Your current data is kept
                as a snapshot you can restore below.
              </p>
            </div>
          )
        ) : null}
      </Card>

      {/* ---- Backup ---- */}
      <Card>
        <h2 className="mb-1 font-bold">Backup</h2>
        <p className="muted mb-3 text-sm">
          Export a file every few weeks. It is the only copy that survives clearing your browser.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-ghost"
            onClick={() => downloadJson(state, `study-tracker-${todayKey()}.json`)}
          >
            <Download size={15} /> Export backup
          </button>
          <button className="btn btn-ghost" onClick={() => fileInput.current?.click()}>
            <Upload size={15} /> Import backup
          </button>
          <button className="btn btn-ghost" onClick={restoreBackup}>
            <RotateCcw size={15} /> Restore last snapshot
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = "";
            }}
          />
        </div>
        {importError ? (
          <p className="mt-2 text-xs" style={{ color: "var(--bad)" }}>
            {importError}
          </p>
        ) : null}
      </Card>

      {/* ---- Danger ---- */}
      <Card style={{ borderColor: "var(--bad)" }}>
        <h2 className="mb-1 font-bold">Start over</h2>
        <p className="muted mb-3 text-sm">
          Wipes every teacher, class, log, result and goal on this device and reloads the default
          SSC subjects. Export a backup first.
        </p>
        <ConfirmButton
          confirmLabel="Erase everything?"
          onConfirm={() => replaceAll(emptyState())}
        >
          Reset all data
        </ConfirmButton>
      </Card>

      {/* ---- Subject editor ---- */}
      <Modal
        open={subjectDraft !== null}
        onClose={() => setSubjectDraft(null)}
        title={state.subjects.some((x) => x.id === subjectDraft?.id) ? "Edit subject" : "Add subject"}
      >
        {subjectDraft ? (
          <div className="space-y-3">
            <Field label="Name">
              <input
                className="input"
                autoFocus
                value={subjectDraft.name}
                onChange={(e) => setSubjectDraft({ ...subjectDraft, name: e.target.value })}
              />
            </Field>
            <Field label="Bangla name">
              <input
                className="input"
                value={subjectDraft.nameBn ?? ""}
                onChange={(e) => setSubjectDraft({ ...subjectDraft, nameBn: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Colour">
                <input
                  className="input h-10 !p-1"
                  type="color"
                  value={subjectDraft.color}
                  onChange={(e) => setSubjectDraft({ ...subjectDraft, color: e.target.value })}
                />
              </Field>
              <Field label="Full marks">
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={subjectDraft.fullMarks ?? 100}
                  onChange={(e) =>
                    setSubjectDraft({ ...subjectDraft, fullMarks: Number(e.target.value) || 100 })
                  }
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="btn btn-ghost" onClick={() => setSubjectDraft(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!subjectDraft.name.trim()}
                onClick={() => {
                  upsert("subjects", { ...subjectDraft, name: subjectDraft.name.trim() });
                  setSubjectDraft(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
