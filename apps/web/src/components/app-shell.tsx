"use client";

import { cn } from "@repo/ui";
import { BookMarked, CalendarCheck, Dumbbell, House, Layers, MessageCircle, Settings2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SelectionVocab } from "./selection-vocab";

interface NavItem {
  href: string;
  label: string;
  icon: typeof House;
  /** Other routes that highlight this item. */
  also?: string[];
  mobile?: boolean;
}

const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: House, mobile: true },
  { href: "/daily", label: "Daily", icon: CalendarCheck },
  { href: "/tutor", label: "Tutor", icon: MessageCircle, mobile: true },
  {
    href: "/practice",
    label: "Practice",
    icon: Dumbbell,
    also: ["/grammar", "/writing", "/daily", "/reading", "/listening", "/pronunciation", "/mistakes", "/ielts", "/idioms", "/reports", "/achievements"],
    mobile: true,
  },
  { href: "/dictionary", label: "Dictionary", icon: BookMarked },
  { href: "/review", label: "Review", icon: Layers, mobile: true },
  { href: "/progress", label: "Progress", icon: TrendingUp, mobile: true },
];

/** Screens that run in focus mode on mobile (no tab bar). */
const FOCUS_ROUTES = ["/tutor", "/review"];

function isActive(pathname: string, item: NavItem, exact: boolean) {
  if (item.href === "/") return pathname === "/";
  if (pathname.startsWith(item.href)) return true;
  // On desktop "Daily" has its own item; on mobile it lives under Practice.
  return !exact && (item.also ?? []).some((p) => pathname.startsWith(p));
}

export function AppShell({ children, dueCount }: { children: React.ReactNode; dueCount: number }) {
  const pathname = usePathname();
  const focus = FOCUS_ROUTES.some((r) => pathname.startsWith(r));

  const badge = (item: NavItem, className: string) =>
    item.href === "/review" && dueCount > 0 ? <span className={className}>{dueCount}</span> : null;

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border px-3 py-6 lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-3">
          <span className="grid size-9 place-items-center rounded-full bg-primary font-display text-lg font-extrabold text-primary-foreground">“</span>
          <span className="font-display text-2xl font-extrabold tracking-tight">ello</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map((item) => {
            const active = isActive(pathname, { ...item, also: item.also?.filter((p) => !NAV.some((n) => n.href === p)) }, false);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary",
                )}
              >
                <item.icon className="size-5" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {badge(item, "rounded-full bg-mistake px-2 py-0.5 font-mono text-xs text-white")}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-muted-foreground hover:bg-muted hover:text-foreground",
            pathname.startsWith("/settings") && "bg-primary-soft text-primary",
          )}
        >
          <Settings2 className="size-5" aria-hidden /> Settings
        </Link>
      </aside>

      <div className={cn("min-w-0 flex-1", !focus && "pb-20 lg:pb-0")}>{children}</div>
      <SelectionVocab />

      {!focus ? (
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          {NAV.filter((n) => n.mobile).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex h-16 min-w-0 flex-col items-center justify-center gap-1 truncate text-[11px] font-semibold text-muted-foreground sm:text-xs",
                isActive(pathname, { ...item, also: [...(item.also ?? []), ...(item.href === "/practice" ? ["/dictionary"] : [])] }, false) && "text-primary",
              )}
            >
              <item.icon className="size-6" aria-hidden />
              {item.label}
              {badge(item, "absolute right-[calc(50%-22px)] top-2 rounded-full bg-mistake px-1.5 font-mono text-[10px] text-white")}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
