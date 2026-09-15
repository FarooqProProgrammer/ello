import type { CefrLevel } from "@repo/core";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "soft" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClass: Record<ButtonVariant, string> = {
  primary: "pressable bg-primary text-primary-foreground hover:brightness-110",
  secondary: "pressable bg-card text-foreground border border-border [--edge:var(--border)] hover:bg-muted",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  soft: "bg-primary-soft text-primary hover:brightness-95",
  danger: "pressable bg-destructive text-white [--edge:color-mix(in_srgb,var(--destructive),black_25%)]",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm rounded-xl gap-1.5",
  md: "h-11 px-5 text-[15px] rounded-xl gap-2",
  lg: "h-14 px-6 text-base rounded-xl gap-2 w-full",
  icon: "h-10 w-10 rounded-full justify-center",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius)] border border-border bg-card p-4 md:p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("font-display text-lg font-bold tracking-tight", className)} {...props} />;
}

export const CEFR_COLOR: Record<CefrLevel, string> = {
  A1: "var(--cefr-a1)",
  A2: "var(--cefr-a2)",
  B1: "var(--cefr-b1)",
  B2: "var(--cefr-b2)",
  C1: "var(--cefr-c1)",
  C2: "var(--cefr-c2)",
};

export function LevelStamp({ level, size = "sm", className }: { level: CefrLevel; size?: "sm" | "lg"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-mono font-medium text-[#14131C]",
        size === "sm" ? "h-6 px-1.5 text-xs" : "h-10 px-3 text-lg",
        className,
      )}
      style={{ background: CEFR_COLOR[level] }}
      aria-label={`Level ${level}`}
    >
      {level}
    </span>
  );
}

export function ProgressBar({
  value,
  className,
  color = "var(--primary)",
  label,
}: {
  value: number;
  className?: string;
  color?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Chip({
  children,
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "mistake" | "correct" | "highlight" | "primary" | "streak" }) {
  const tones = {
    neutral: "bg-muted text-foreground",
    mistake: "bg-mistake-soft text-foreground border border-mistake/40",
    correct: "bg-correct-soft text-foreground border border-correct/40",
    highlight: "bg-highlight-soft text-foreground border border-highlight",
    primary: "bg-primary-soft text-primary",
    streak: "bg-streak-soft text-foreground",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)} {...props}>
      {children}
    </span>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} style={style} />;
}

export function Alert({
  tone = "mistake",
  children,
  action,
  className,
}: {
  tone?: "mistake" | "correct" | "streak";
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const border = { mistake: "border-l-mistake bg-mistake-soft", correct: "border-l-correct bg-correct-soft", streak: "border-l-streak bg-streak-soft" }[tone];
  return (
    <div role="status" className={cn("flex items-center gap-3 rounded-xl border-l-4 px-4 py-3 text-sm", border, className)}>
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <div className="mb-1 grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">{icon}</div>
      <p className="font-semibold">{title}</p>
      {body ? <p className="max-w-xs text-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
