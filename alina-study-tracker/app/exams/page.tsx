"use client";

import { useMemo, useState } from "react";
import { Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Card, ConfirmButton, Dot, Empty, Field, Modal, PageHeader, Stat } from "@/components/ui";
import { LineChart, type Point } from "@/components/charts";
import { subjectAverage } from "@/lib/selectors";
import { formatDay, todayKey } from "@/lib/date";
import type { ExamKind, ExamResult } from "@/lib/types";

const KIND_LABEL: Record<ExamKind, string> = {
  MODEL: "Model test",
  SCHOOL: "School exam",
  COACHING: "Coaching test",
  TUTOR: "Tutor test",
  OTHER: "Other",
};

export default function ExamsPage() {
  const { state, upsert, remove } = useStore();
  const [draft, setDraft] = useState<ExamResult | null>(null);
  const [focus, setFocus] = useState<string>("ALL");

  const subjects = state.subjects.filter((s) => !s.archived);

  const blank = (): ExamResult => ({
    id: uid("ex"),
    date: todayKey(),
    subjectId: focus !== "ALL" ? focus : (subjects[0]?.id ?? ""),
    name: "",
    kind: "MODEL",
    marks: 0,
    total: 100,
  });

  const rows = useMemo(
    () =>
      [...state.exams]
        .filter((e) => focus === "ALL" || e.subjectId === focus)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.exams, focus],
  );

  const chartData: Point[] = useMemo(
    () =>
      [...rows]
        .sort((a, b) => a.date.localeCompare(b.date))
        .filter((e) => e.total > 0)
        .map((e) => ({
          label: formatDay(e.date),
          value: Math.round((e.marks / e.total) * 100),
        })),
    [rows],
  );

  const overallAvg = useMemo(() => {
    const valid = state.exams.filter((e) => e.total > 0);
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((s, e) => s + (e.marks / e.total) * 100, 0) / valid.length);
  }, [state.exams]);

  /** Compares the newest three results against the three before them. */
  const trend = useMemo(() => {
    if (chartData.length < 4) return null;
    const recent = chartData.slice(-3);
    const older = chartData.slice(-6, -3);
    if (older.length === 0) return null;
    const avg = (xs: Point[]) => xs.reduce((s, p) => s + p.value, 0) / xs.length;
    return Math.round(avg(recent) - avg(older));
  }, [chartData]);

  const weakest = useMemo(() => {
    const scored = subjects
      .map((s) => ({ s, avg: subjectAverage(state, s.id) }))
      .filter((x): x is { s: (typeof subjects)[number]; avg: number } => x.avg !== null)
      .sort((a, b) => a.avg - b.avg);
    return scored.slice(0, 3);
  }, [state, subjects]);

  return (
    <div>
      <PageHeader
        title="Test results"
        subtitle="Log every model test, school exam and coaching test. The trend matters far more than any single number."
        action={
          <button
            className="btn btn-primary"
            disabled={subjects.length === 0}
            onClick={() => setDraft(blank())}
          >
            <Plus size={16} /> Add result
          </button>
        }
      />

      {state.exams.length === 0 ? (
        <Empty
          title="No results logged yet"
          hint="After each test, record the marks. Once there are a few, you'll see whether you're improving."
          action={
            <button
              className="btn btn-primary"
              disabled={subjects.length === 0}
              onClick={() => setDraft(blank())}
            >
              <Plus size={16} /> Add the first result
            </button>
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Average" value={`${overallAvg ?? 0}%`} sub={`${state.exams.length} tests`} />
            <Stat
              label="Trend"
              value={
                trend === null ? "—" : `${trend > 0 ? "+" : ""}${trend}%`
              }
              sub={trend === null ? "Need 4+ results" : "Last 3 vs previous 3"}
              tone={trend === null ? "default" : trend >= 0 ? "good" : "bad"}
              icon={
                trend !== null && trend < 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />
              }
            />
            <Stat
              label="Best"
              value={
                state.exams.length
                  ? `${Math.max(...state.exams.filter((e) => e.total > 0).map((e) => Math.round((e.marks / e.total) * 100)))}%`
                  : "—"
              }
              tone="good"
            />
            <Stat
              label="Weakest"
              value={weakest[0] ? `${weakest[0].avg}%` : "—"}
              sub={weakest[0]?.s.name}
              tone="warn"
            />
          </div>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold">
                {focus === "ALL"
                  ? "All subjects over time"
                  : `${subjects.find((s) => s.id === focus)?.name} over time`}
              </h2>
              <select
                className="input !w-auto !py-1 text-xs"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
              >
                <option value="ALL">All subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <LineChart
              data={chartData}
              color={focus === "ALL" ? "var(--accent)" : subjects.find((s) => s.id === focus)?.color}
            />
          </Card>

          {weakest.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-sm font-bold">Subjects to push on</h2>
              <ul className="space-y-2">
                {weakest.map(({ s, avg }) => (
                  <li key={s.id} className="flex items-center gap-3 text-sm">
                    <Dot color={s.color} />
                    <span className="flex-1 truncate">{s.name}</span>
                    <span
                      className="font-bold tabular-nums"
                      style={{ color: avg < 50 ? "var(--bad)" : avg < 70 ? "var(--warn)" : "var(--good)" }}
                    >
                      {avg}%
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <div>
            <h2 className="muted mb-2 text-xs font-bold uppercase tracking-wide">
              All results ({rows.length})
            </h2>
            <div className="space-y-1.5">
              {rows.map((e) => {
                const pct = e.total > 0 ? Math.round((e.marks / e.total) * 100) : 0;
                const subject = state.subjects.find((s) => s.id === e.subjectId);
                return (
                  <Card key={e.id} className="!px-3 !py-2.5">
                    <button className="flex w-full items-center gap-3 text-left" onClick={() => setDraft({ ...e })}>
                      <Dot color={subject?.color ?? "#94a3b8"} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {e.name || KIND_LABEL[e.kind]}
                        </div>
                        <div className="muted text-xs">
                          {subject?.name ?? "Unknown"} · {KIND_LABEL[e.kind]} · {formatDay(e.date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-sm font-bold tabular-nums"
                          style={{ color: pct < 50 ? "var(--bad)" : pct < 70 ? "var(--warn)" : "var(--good)" }}
                        >
                          {pct}%
                        </div>
                        <div className="muted text-[11px] tabular-nums">
                          {e.marks}/{e.total}
                        </div>
                      </div>
                    </button>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={state.exams.some((e) => e.id === draft?.id) ? "Edit result" : "Add result"}
      >
        {draft ? (
          <div className="space-y-3">
            <Field label="Test name">
              <input
                className="input"
                autoFocus
                value={draft.name}
                placeholder="e.g. Model Test 3, Half-yearly"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Subject">
                <select
                  className="input"
                  value={draft.subjectId}
                  onChange={(e) => {
                    const s = state.subjects.find((x) => x.id === e.target.value);
                    setDraft({
                      ...draft,
                      subjectId: e.target.value,
                      total: s?.fullMarks ?? draft.total,
                    });
                  }}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select
                  className="input"
                  value={draft.kind}
                  onChange={(e) => setDraft({ ...draft, kind: e.target.value as ExamKind })}
                >
                  {Object.entries(KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Marks">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={draft.marks}
                  onChange={(e) => setDraft({ ...draft, marks: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Out of">
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={draft.total}
                  onChange={(e) => setDraft({ ...draft, total: Number(e.target.value) || 1 })}
                />
              </Field>
              <Field label="Date">
                <input
                  className="input"
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </Field>
            </div>
            {draft.total > 0 ? (
              <p className="muted text-xs">
                That is <strong>{Math.round((draft.marks / draft.total) * 100)}%</strong>.
              </p>
            ) : null}
            <Field label="Note" hint="What went wrong, what to fix next time.">
              <textarea
                className="input"
                rows={2}
                value={draft.note ?? ""}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </Field>
            <div className="flex justify-between gap-2 pt-1">
              {state.exams.some((e) => e.id === draft.id) ? (
                <ConfirmButton
                  className="btn btn-danger"
                  onConfirm={() => {
                    remove("exams", draft.id);
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
                  disabled={!draft.subjectId || draft.total <= 0}
                  onClick={() => {
                    upsert("exams", draft);
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
