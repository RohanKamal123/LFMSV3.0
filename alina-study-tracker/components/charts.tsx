"use client";

import React, { useId } from "react";

/**
 * Deliberately dependency-free SVG charts. The data volumes here are tiny
 * (a few dozen points), so a charting library would cost more in bundle size
 * and theme-wrangling than it saves.
 */

export interface Point {
  label: string;
  value: number;
}

export function BarChart({
  data,
  height = 160,
  color = "var(--accent)",
  suffix = "",
  target,
}: {
  data: Point[];
  height?: number;
  color?: string;
  suffix?: string;
  /** Optional horizontal reference line, e.g. the daily study goal. */
  target?: number;
}) {
  if (data.length === 0) {
    return <p className="muted py-6 text-center text-sm">Nothing logged yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.value), target ?? 0, 1);
  const targetPct = target ? (target / max) * 100 : null;

  return (
    <div>
      <div className="relative flex items-end gap-1.5" style={{ height }}>
        {targetPct !== null ? (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed"
            style={{ bottom: `${targetPct}%`, borderColor: "var(--warn)" }}
            title={`Target: ${target}${suffix}`}
          />
        ) : null}
        {data.map((d, i) => (
          <div key={i} className="group flex h-full flex-1 flex-col justify-end">
            <div
              className="relative w-full rounded-t-md transition-all"
              style={{
                height: `${Math.max(d.value === 0 ? 0 : 3, (d.value / max) * 100)}%`,
                background: d.value === 0 ? "var(--surface-2)" : color,
                minHeight: d.value === 0 ? 2 : undefined,
              }}
              title={`${d.label}: ${d.value}${suffix}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="muted flex-1 truncate text-center text-[10px]">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  data,
  height = 180,
  color = "var(--accent)",
  suffix = "%",
}: {
  data: Point[];
  height?: number;
  color?: string;
  suffix?: string;
}) {
  const gradientId = useId();

  if (data.length === 0) {
    return <p className="muted py-6 text-center text-sm">No results recorded yet.</p>;
  }
  if (data.length === 1) {
    return (
      <div className="py-6 text-center">
        <div className="text-3xl font-bold" style={{ color }}>
          {data[0].value}
          {suffix}
        </div>
        <div className="muted mt-1 text-xs">
          {data[0].label} — add another result to see the trend.
        </div>
      </div>
    );
  }

  const w = 100;
  const h = 100;
  const pad = 6;
  const max = Math.max(...data.map((d) => d.value), 100);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = max - min || 1;

  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.value - min) / span) * (h - pad * 2);
    return { x, y, d };
  });

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x.toFixed(2)},${h - pad} L${pts[0].x.toFixed(2)},${h - pad} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height }}
        role="img"
        aria-label="Score trend over time"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.8" fill={color} vectorEffect="non-scaling-stroke">
            <title>{`${p.d.label}: ${p.d.value}${suffix}`}</title>
          </circle>
        ))}
      </svg>
      <div className="muted mt-1 flex justify-between text-[10px]">
        <span>{data[0].label}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}

export function Donut({
  percent,
  size = 120,
  stroke = 12,
  color = "var(--accent)",
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? <span className="text-xl font-bold">{pct}%</span>}
      </div>
    </div>
  );
}
