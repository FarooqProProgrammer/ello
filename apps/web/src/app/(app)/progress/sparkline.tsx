"use client";

import { useState } from "react";

const W = 200;
const H = 48;
const PAD = 4;

/** Single-series 0–100 trend with a hover readout. */
export function Sparkline({ points, label }: { points: { score: number; at: string }[]; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const x = (i: number) => PAD + (i / Math.max(1, points.length - 1)) * (W - PAD * 2);
  const y = (s: number) => H - PAD - (s / 100) * (H - PAD * 2);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const active = hover !== null ? points[hover] : undefined;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-12 w-full overflow-visible"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} trend: ${points.map((p) => Math.round(p.score)).join(", ")}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const rel = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round(((rel - PAD) / (W - PAD * 2)) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
      >
        <line x1={PAD} x2={W - PAD} y1={y(50)} y2={y(50)} stroke="var(--border)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {active && hover !== null ? (
          <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="var(--muted-foreground)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
      {active && hover !== null ? (
        <span
          className="pointer-events-none absolute -top-7 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-0.5 text-xs text-background"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          {Math.round(active.score)} · {new Date(active.at).toLocaleDateString("en", { month: "short", day: "numeric" })}
        </span>
      ) : null}
    </div>
  );
}
