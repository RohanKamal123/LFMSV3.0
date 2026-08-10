"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Card, Empty, Field, Modal, PageHeader, Progress, Stat } from "@/components/ui";
import {
  currentMonthKey,
  formatMonthKey,
  shiftMonthKey,
  todayKey,
} from "@/lib/date";
import type { FeePayment, Teacher } from "@/lib/types";

export default function FeesPage() {
  const { state, upsert, update } = useStore();
  const [month, setMonth] = useState(currentMonthKey());
  const [draft, setDraft] = useState<FeePayment | null>(null);

  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;

  /** Teachers she was actually studying with during this month. */
  const relevant = useMemo(
    () =>
      state.teachers
        .filter((t) => t.startedOn <= monthEnd && (!t.endedOn || t.endedOn >= monthStart))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state.teachers, monthStart, monthEnd],
  );

  const feeFor = (t: Teacher): FeePayment | undefined =>
    state.fees.find((f) => f.teacherId === t.id && f.month === month);

  /** Attendance from the class logs, so payment and delivery sit side by side. */
  const attendanceFor = (t: Teacher) => {
    const logs = state.sessionLogs.filter(
      (l) => l.teacherId === t.id && l.date >= monthStart && l.date <= monthEnd,
    );
    return {
      held: logs.filter((l) => l.status === "HELD").length,
      cancelled: logs.filter((l) => l.status === "CANCELLED").length,
      missed: logs.filter((l) => l.status === "MISSED").length,
      total: logs.length,
    };
  };

  const totals = useMemo(() => {
    let due = 0;
    let paid = 0;
    for (const t of relevant) {
      const f = state.fees.find((x) => x.teacherId === t.id && x.month === month);
      const amount = f?.amount ?? t.fee ?? 0;
      due += amount;
      if (f?.paid) paid += amount;
    }
    return { due, paid, outstanding: due - paid };
  }, [relevant, state.fees, month]);

  const togglePaid = (t: Teacher) => {
    const existing = feeFor(t);
    if (existing) {
      upsert("fees", {
        ...existing,
        paid: !existing.paid,
        paidOn: !existing.paid ? todayKey() : undefined,
      });
    } else {
      upsert("fees", {
        id: uid("fee"),
        teacherId: t.id,
        month,
        amount: t.fee ?? 0,
        paid: true,
        paidOn: todayKey(),
      });
    }
  };

  const openEditor = (t: Teacher) => {
    const existing = feeFor(t);
    setDraft(
      existing
        ? { ...existing }
        : {
            id: uid("fee"),
            teacherId: t.id,
            month,
            amount: t.fee ?? 0,
            paid: false,
          },
    );
  };

  return (
    <div>
      <PageHeader
        title="Fees & attendance"
        subtitle="What is owed each month, next to how many classes actually happened."
      />

      <div className="mb-5 flex items-center justify-between gap-2">
        <button
          className="btn btn-ghost !px-2.5"
          onClick={() => setMonth(shiftMonthKey(month, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-sm font-bold">{formatMonthKey(month)}</h2>
        <button
          className="btn btn-ghost !px-2.5"
          onClick={() => setMonth(shiftMonthKey(month, 1))}
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {relevant.length === 0 ? (
        <Empty
          title="No teachers for this month"
          hint="Fees are built from the teachers you were studying with during the month."
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total due" value={`৳${totals.due.toLocaleString()}`} icon={<Wallet size={13} />} />
            <Stat label="Paid" value={`৳${totals.paid.toLocaleString()}`} tone="good" />
            <Stat
              label="Outstanding"
              value={`৳${totals.outstanding.toLocaleString()}`}
              tone={totals.outstanding > 0 ? "bad" : "good"}
            />
          </div>

          {totals.due > 0 ? (
            <Progress
              value={(totals.paid / totals.due) * 100}
              color={totals.paid >= totals.due ? "var(--good)" : "var(--accent)"}
              height={8}
            />
          ) : null}

          <div className="space-y-2">
            {relevant.map((t) => {
              const fee = feeFor(t);
              const amount = fee?.amount ?? t.fee ?? 0;
              const att = attendanceFor(t);
              return (
                <Card key={t.id} className="!px-3 !py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => openEditor(t)}
                    >
                      <div className="truncate text-sm font-bold">{t.name}</div>
                      <div className="muted mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="chip">{t.kind === "COACHING" ? "Coaching" : "Tutor"}</span>
                        {t.feeDueDay ? <span>Due on the {t.feeDueDay}th</span> : null}
                        {fee?.paid && fee.paidOn ? <span>Paid {fee.paidOn}</span> : null}
                      </div>
                      {att.total > 0 ? (
                        <div className="muted mt-1.5 flex flex-wrap gap-2 text-[11px]">
                          <span style={{ color: "var(--good)" }}>{att.held} held</span>
                          {att.cancelled > 0 ? <span>{att.cancelled} cancelled</span> : null}
                          {att.missed > 0 ? (
                            <span style={{ color: "var(--bad)" }}>{att.missed} missed</span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="muted mt-1.5 text-[11px]">No classes logged this month</div>
                      )}
                    </button>

                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums">
                        ৳{amount.toLocaleString()}
                      </div>
                      <button
                        className="chip mt-1"
                        style={
                          fee?.paid
                            ? { background: "var(--good)", color: "#fff", borderColor: "var(--good)" }
                            : { color: "var(--text)" }
                        }
                        onClick={() => togglePaid(t)}
                      >
                        {fee?.paid ? "Paid" : "Mark paid"}
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="muted text-xs">
            Amounts default to the monthly fee on each teacher&apos;s profile. Tap a row to override
            it for just this month.
          </p>
        </div>
      )}

      <Modal open={draft !== null} onClose={() => setDraft(null)} title="Fee for this month">
        {draft ? (
          <div className="space-y-3">
            <p className="muted text-sm">
              {state.teachers.find((t) => t.id === draft.teacherId)?.name} ·{" "}
              {formatMonthKey(draft.month)}
            </p>
            <Field label="Amount (৳)">
              <input
                className="input"
                type="number"
                min={0}
                autoFocus
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) || 0 })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.paid}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    paid: e.target.checked,
                    paidOn: e.target.checked ? (draft.paidOn ?? todayKey()) : undefined,
                  })
                }
              />
              Paid
            </label>
            {draft.paid ? (
              <Field label="Paid on">
                <input
                  className="input"
                  type="date"
                  value={draft.paidOn ?? todayKey()}
                  onChange={(e) => setDraft({ ...draft, paidOn: e.target.value })}
                />
              </Field>
            ) : null}
            <Field label="Note">
              <input
                className="input"
                value={draft.note ?? ""}
                placeholder="e.g. paid via bKash"
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </Field>
            <div className="flex justify-between gap-2 pt-1">
              {state.fees.some((f) => f.id === draft.id) ? (
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    update((s) => {
                      s.fees = s.fees.filter((f) => f.id !== draft.id);
                    });
                    setDraft(null);
                  }}
                >
                  Clear
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setDraft(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    upsert("fees", draft);
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
