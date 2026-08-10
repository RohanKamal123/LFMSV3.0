"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Pause, Play, Plus, Square } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Card, ConfirmButton, Dot, Field, Modal, PageHeader, Progress, Stat } from "@/components/ui";
import { BarChart, type Point } from "@/components/charts";
import { studyBySubject, studyMinutesOn, studyStreak, subjectColor } from "@/lib/selectors";
import { addDays, formatDuration, todayKey, WEEKDAY_SHORT, weekdayOf } from "@/lib/date";
import type { StudySession } from "@/lib/types";

export default function StudyPage() {
  const { state, upsert, remove, update } = useStore();
  const today = todayKey();

  const [subjectId, setSubjectId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [manual, setManual] = useState<StudySession | null>(null);

  // Wall-clock anchored so a backgrounded phone tab does not lose time.
  const startedAt = useRef<number | null>(null);
  const accumulated = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const base = accumulated.current;
      const live = startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0;
      setElapsed(base + live);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running]);

  const start = () => {
    startedAt.current = Date.now();
    setRunning(true);
  };

  const pause = () => {
    if (startedAt.current) accumulated.current += (Date.now() - startedAt.current) / 1000;
    startedAt.current = null;
    setRunning(false);
  };

  const stop = () => {
    if (startedAt.current) accumulated.current += (Date.now() - startedAt.current) / 1000;
    const minutes = Math.round(accumulated.current / 60);
    if (minutes >= 1) {
      upsert("studySessions", {
        id: uid("ss"),
        date: today,
        subjectId: subjectId || null,
        minutes,
        startedAt: new Date().toISOString(),
      });
    }
    accumulated.current = 0;
    startedAt.current = null;
    setElapsed(0);
    setRunning(false);
  };

  const minutesToday = studyMinutesOn(state, today);
  const target = state.settings.dailyStudyMinutesTarget || 180;
  const streak = studyStreak(state);

  const last14: Point[] = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = addDays(today, -(13 - i));
        return {
          label: WEEKDAY_SHORT[weekdayOf(d)].slice(0, 1),
          value: studyMinutesOn(state, d),
        };
      }),
    [state, today],
  );

  const bySubject = useMemo(() => studyBySubject(state, 7), [state]);
  const weekTotal = last14.slice(-7).reduce((s, p) => s + p.value, 0);

  const todaySessions = useMemo(
    () => state.studySessions.filter((s) => s.date === today),
    [state.studySessions, today],
  );

  const mmss = `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(
    Math.floor((elapsed % 3600) / 60),
  ).padStart(2, "0")}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;

  const quickAdd = (mins: number) => {
    update((draft) => {
      draft.studySessions.push({
        id: uid("ss"),
        date: today,
        subjectId: subjectId || null,
        minutes: mins,
        startedAt: new Date().toISOString(),
      });
    });
  };

  return (
    <div>
      <PageHeader
        title="Study timer"
        subtitle="Track self-study only — classes are counted separately from the schedule."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="text-center">
            <select
              className="input mb-4"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">General study</option>
              {state.subjects
                .filter((s) => !s.archived)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>

            <div className="my-2 text-5xl font-bold tabular-nums tracking-tight">{mmss}</div>
            <p className="muted mb-4 text-xs">
              {running ? "Running — keep going." : elapsed > 0 ? "Paused" : "Ready when you are"}
            </p>

            <div className="flex justify-center gap-2">
              {running ? (
                <button className="btn btn-ghost" onClick={pause}>
                  <Pause size={16} /> Pause
                </button>
              ) : (
                <button className="btn btn-primary" onClick={start}>
                  <Play size={16} /> {elapsed > 0 ? "Resume" : "Start"}
                </button>
              )}
              <button className="btn btn-ghost" onClick={stop} disabled={elapsed < 60}>
                <Square size={16} /> Save & stop
              </button>
            </div>
            {elapsed > 0 && elapsed < 60 ? (
              <p className="muted mt-2 text-[11px]">Sessions under a minute are not saved.</p>
            ) : null}

            <div
              className="mt-4 flex flex-wrap justify-center gap-1.5 border-t pt-4"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="muted mr-1 self-center text-xs">Log without timer:</span>
              {[15, 30, 45, 60].map((m) => (
                <button key={m} className="chip" style={{ color: "var(--text)" }} onClick={() => quickAdd(m)}>
                  +{m}m
                </button>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Today"
              value={formatDuration(minutesToday)}
              sub={`Goal ${formatDuration(target)}`}
              tone={minutesToday >= target ? "good" : "default"}
            />
            <Stat
              label="Streak"
              value={`${streak}d`}
              sub="Days in a row"
              tone={streak >= 3 ? "good" : "default"}
              icon={<Flame size={13} />}
            />
          </div>

          <div>
            <div className="mb-1.5 flex justify-between text-xs font-semibold">
              <span className="muted">Today&apos;s goal</span>
              <span className="muted">
                {formatDuration(minutesToday)} / {formatDuration(target)}
              </span>
            </div>
            <Progress
              value={(minutesToday / target) * 100}
              color={minutesToday >= target ? "var(--good)" : "var(--accent)"}
              height={10}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-bold">Last 14 days</h2>
              <span className="muted text-xs">
                This week: <strong>{formatDuration(weekTotal)}</strong>
              </span>
            </div>
            <BarChart data={last14} suffix="m" target={target} />
            <p className="muted mt-2 text-[11px]">Dashed line is your daily goal.</p>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-bold">Where the last 7 days went</h2>
            {bySubject.length === 0 ? (
              <p className="muted py-4 text-center text-sm">No study logged this week yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {bySubject.map(({ subjectId: sid, minutes }) => {
                  const total = bySubject.reduce((s, x) => s + x.minutes, 0);
                  const name = sid
                    ? (state.subjects.find((s) => s.id === sid)?.name ?? "Unknown")
                    : "General";
                  return (
                    <li key={sid ?? "general"}>
                      <div className="mb-1 flex items-center gap-2 text-xs">
                        <Dot color={subjectColor(state, sid)} />
                        <span className="flex-1 truncate">{name}</span>
                        <span className="muted tabular-nums">{formatDuration(minutes)}</span>
                      </div>
                      <Progress
                        value={total ? (minutes / total) * 100 : 0}
                        color={subjectColor(state, sid)}
                        height={5}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Today&apos;s sessions</h2>
              <button
                className="btn btn-ghost !px-2 !py-1 text-xs"
                onClick={() =>
                  setManual({
                    id: uid("ss"),
                    date: today,
                    subjectId: subjectId || null,
                    minutes: 30,
                  })
                }
              >
                <Plus size={13} /> Add
              </button>
            </div>
            {todaySessions.length === 0 ? (
              <p className="muted py-3 text-center text-sm">Nothing logged today.</p>
            ) : (
              <ul className="space-y-1.5">
                {todaySessions.map((s) => (
                  <li key={s.id}>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm"
                      style={{ background: "var(--surface-2)" }}
                      onClick={() => setManual({ ...s })}
                    >
                      <Dot color={subjectColor(state, s.subjectId)} />
                      <span className="flex-1 truncate">
                        {s.subjectId
                          ? state.subjects.find((x) => x.id === s.subjectId)?.name
                          : "General study"}
                      </span>
                      <span className="muted tabular-nums text-xs">{formatDuration(s.minutes)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal open={manual !== null} onClose={() => setManual(null)} title="Study session">
        {manual ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Subject">
                <select
                  className="input"
                  value={manual.subjectId ?? ""}
                  onChange={(e) => setManual({ ...manual, subjectId: e.target.value || null })}
                >
                  <option value="">General study</option>
                  {state.subjects
                    .filter((s) => !s.archived)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Minutes">
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={manual.minutes}
                  onChange={(e) => setManual({ ...manual, minutes: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
            <Field label="Date">
              <input
                className="input"
                type="date"
                value={manual.date}
                onChange={(e) => setManual({ ...manual, date: e.target.value })}
              />
            </Field>
            <Field label="Note">
              <input
                className="input"
                value={manual.note ?? ""}
                placeholder="What did you work on?"
                onChange={(e) => setManual({ ...manual, note: e.target.value })}
              />
            </Field>
            <div className="flex justify-between gap-2 pt-1">
              {state.studySessions.some((s) => s.id === manual.id) ? (
                <ConfirmButton
                  className="btn btn-danger"
                  onConfirm={() => {
                    remove("studySessions", manual.id);
                    setManual(null);
                  }}
                >
                  Delete
                </ConfirmButton>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setManual(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={manual.minutes <= 0}
                  onClick={() => {
                    upsert("studySessions", manual);
                    setManual(null);
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
