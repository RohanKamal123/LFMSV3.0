"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Card, ConfirmButton, Dot, Empty, Field, Modal, PageHeader, Progress } from "@/components/ui";
import { Donut } from "@/components/charts";
import { daysToExam, pacePercent, syllabusProgress } from "@/lib/selectors";
import type { Chapter, ChapterStatus } from "@/lib/types";

const STATUS_ORDER: ChapterStatus[] = ["NOT_STARTED", "LEARNING", "DONE", "REVISED"];

const STATUS_META: Record<ChapterStatus, { label: string; color: string }> = {
  NOT_STARTED: { label: "Not started", color: "var(--muted)" },
  LEARNING: { label: "Learning", color: "var(--warn)" },
  DONE: { label: "Done", color: "var(--good)" },
  REVISED: { label: "Revised", color: "var(--accent)" },
};

export default function SyllabusPage() {
  const { state, update, upsert, remove } = useStore();
  const [open, setOpen] = useState<string | null>(state.subjects[0]?.id ?? null);
  const [chapterDraft, setChapterDraft] = useState<Chapter | null>(null);

  const overall = useMemo(() => syllabusProgress(state), [state]);
  const pace = pacePercent(state);
  const left = daysToExam(state);
  const subjects = state.subjects.filter((s) => !s.archived);

  const cycleStatus = (chapter: Chapter) => {
    update((draft) => {
      const c = draft.chapters.find((x) => x.id === chapter.id);
      if (!c) return;
      const next = STATUS_ORDER[(STATUS_ORDER.indexOf(c.status) + 1) % STATUS_ORDER.length];
      c.status = next;
      c.updatedAt = new Date().toISOString();
      // Confidence tracks the status unless she has set it by hand.
      if (next === "NOT_STARTED") c.confidence = 0;
      if (next === "DONE" && c.confidence < 2) c.confidence = 2;
      if (next === "REVISED") c.confidence = 3;
    });
  };

  const setConfidence = (id: string, value: number) => {
    update((draft) => {
      const c = draft.chapters.find((x) => x.id === id);
      if (c) {
        c.confidence = value;
        c.updatedAt = new Date().toISOString();
      }
    });
  };

  const behind = overall.percent < pace - 5;

  return (
    <div>
      <PageHeader
        title="Syllabus progress"
        subtitle="Tap a chapter's badge to move it: Not started → Learning → Done → Revised."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
        <Card className="flex items-center justify-center">
          <Donut percent={overall.percent} size={130} stroke={13}>
            <span className="text-2xl font-bold">{overall.percent}%</span>
            <span className="muted text-[10px]">complete</span>
          </Donut>
        </Card>
        <Card>
          <h2 className="text-sm font-bold">
            {overall.done + overall.revised} of {overall.total} chapters finished
          </h2>
          <div className="mt-3 space-y-2">
            {STATUS_ORDER.map((s) => {
              const count =
                s === "NOT_STARTED"
                  ? overall.notStarted
                  : s === "LEARNING"
                    ? overall.learning
                    : s === "DONE"
                      ? overall.done
                      : overall.revised;
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 font-semibold" style={{ color: STATUS_META[s].color }}>
                    {STATUS_META[s].label}
                  </span>
                  <div className="flex-1">
                    <Progress
                      value={overall.total ? (count / overall.total) * 100 : 0}
                      color={STATUS_META[s].color}
                      height={6}
                    />
                  </div>
                  <span className="muted w-8 text-right tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
          {left > 0 ? (
            <p
              className="mt-4 rounded-lg px-3 py-2 text-xs"
              style={{
                background: behind ? "color-mix(in srgb, var(--warn) 14%, transparent)" : "var(--surface-2)",
              }}
            >
              {behind ? (
                <>
                  <strong>Slightly behind pace.</strong> With {left} days to go, aim for around{" "}
                  {Math.ceil((overall.notStarted + overall.learning) / Math.max(1, Math.floor(left / 7)))}{" "}
                  chapters a week to finish in time.
                </>
              ) : (
                <>
                  <strong>On track.</strong> {overall.notStarted + overall.learning} chapters left over{" "}
                  {Math.floor(left / 7)} weeks — about{" "}
                  {Math.ceil((overall.notStarted + overall.learning) / Math.max(1, Math.floor(left / 7)))}{" "}
                  a week.
                </>
              )}
            </p>
          ) : null}
        </Card>
      </div>

      {subjects.length === 0 ? (
        <Empty
          title="No subjects yet"
          hint="Add your SSC subjects from Settings and their chapter lists come with them."
        />
      ) : (
        <div className="space-y-3">
          {subjects.map((subject) => {
            const chapters = state.chapters
              .filter((c) => c.subjectId === subject.id)
              .sort((a, b) => a.number - b.number);
            const p = syllabusProgress(state, subject.id);
            const isOpen = open === subject.id;

            return (
              <Card key={subject.id} className="!p-0 overflow-hidden">
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setOpen(isOpen ? null : subject.id)}
                >
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <Dot color={subject.color} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-bold">{subject.name}</span>
                      <span className="muted shrink-0 text-xs tabular-nums">
                        {p.done + p.revised}/{p.total} · {p.percent}%
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <Progress value={p.percent} color={subject.color} height={5} />
                    </div>
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t px-2 pb-2" style={{ borderColor: "var(--border)" }}>
                    <ul>
                      {chapters.map((c) => (
                        <li
                          key={c.id}
                          className="flex flex-wrap items-center gap-2 border-b px-2 py-2.5 last:border-b-0"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <span className="muted w-5 shrink-0 text-xs tabular-nums">{c.number}.</span>
                          <button
                            className="min-w-0 flex-1 text-left"
                            onClick={() => setChapterDraft({ ...c })}
                          >
                            <span className="block truncate text-sm">{c.name}</span>
                            {c.nameBn ? (
                              <span className="muted block truncate text-xs">{c.nameBn}</span>
                            ) : null}
                          </button>

                          <div className="flex items-center gap-1.5">
                            {/* Confidence: how exam-ready she feels, 0-3 */}
                            <div className="flex gap-0.5" title="Confidence">
                              {[1, 2, 3].map((n) => (
                                <button
                                  key={n}
                                  aria-label={`Set confidence ${n}`}
                                  onClick={() => setConfidence(c.id, c.confidence === n ? 0 : n)}
                                  className="h-4 w-2 rounded-sm transition-colors"
                                  style={{
                                    background:
                                      c.confidence >= n ? subject.color : "var(--surface-2)",
                                  }}
                                />
                              ))}
                            </div>
                            <button
                              className="chip"
                              style={{
                                color: STATUS_META[c.status].color,
                                borderColor: STATUS_META[c.status].color,
                              }}
                              onClick={() => cycleStatus(c)}
                            >
                              {STATUS_META[c.status].label}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <button
                      className="btn btn-ghost m-2 text-xs"
                      onClick={() =>
                        setChapterDraft({
                          id: uid("ch"),
                          subjectId: subject.id,
                          number: chapters.length + 1,
                          name: "",
                          status: "NOT_STARTED",
                          confidence: 0,
                        })
                      }
                    >
                      <Plus size={13} /> Add chapter
                    </button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={chapterDraft !== null}
        onClose={() => setChapterDraft(null)}
        title={state.chapters.some((c) => c.id === chapterDraft?.id) ? "Edit chapter" : "Add chapter"}
      >
        {chapterDraft ? (
          <div className="space-y-3">
            <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3">
              <Field label="No.">
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={chapterDraft.number}
                  onChange={(e) =>
                    setChapterDraft({ ...chapterDraft, number: Number(e.target.value) || 1 })
                  }
                />
              </Field>
              <Field label="Chapter name">
                <input
                  className="input"
                  autoFocus
                  value={chapterDraft.name}
                  onChange={(e) => setChapterDraft({ ...chapterDraft, name: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Bangla name">
              <input
                className="input"
                value={chapterDraft.nameBn ?? ""}
                onChange={(e) => setChapterDraft({ ...chapterDraft, nameBn: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <div className="flex flex-wrap gap-1.5">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    style={
                      chapterDraft.status === s
                        ? {
                            background: STATUS_META[s].color,
                            color: "#fff",
                            borderColor: STATUS_META[s].color,
                          }
                        : { color: "var(--text)" }
                    }
                    onClick={() => setChapterDraft({ ...chapterDraft, status: s })}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex justify-between gap-2 pt-1">
              {state.chapters.some((c) => c.id === chapterDraft.id) ? (
                <ConfirmButton
                  className="btn btn-danger"
                  onConfirm={() => {
                    remove("chapters", chapterDraft.id);
                    setChapterDraft(null);
                  }}
                >
                  Delete
                </ConfirmButton>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setChapterDraft(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!chapterDraft.name.trim()}
                  onClick={() => {
                    upsert("chapters", { ...chapterDraft, name: chapterDraft.name.trim() });
                    setChapterDraft(null);
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
