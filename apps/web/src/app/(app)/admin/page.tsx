import { adminOverview } from "@repo/db";
import { Card, CardTitle, Chip, LevelStamp } from "@repo/ui";
import { Activity, Bot, Crown, ExternalLink, ShieldCheck, UserPlus, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { authEnabled } from "@/lib/auth";
import { isAdmin, requirePageUser } from "@/lib/current-user";
import { humanizeCategory } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requirePageUser();
  if (!isAdmin(user)) notFound();
  const data = await adminOverview();
  const maxActivity = Math.max(1, ...data.sessionsByActivity.map((s) => s.count));
  const dateFmt = (d: Date | null) => (d ? d.toLocaleDateString("en", { month: "short", day: "numeric" }) : "—");

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
            <ShieldCheck className="size-7 text-primary" /> Admin
          </h1>
          <p className="mt-1 text-muted-foreground">{authEnabled() ? "All accounts" : "Single-user mode"} · last 7 days unless noted</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <a href="http://localhost:8288" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary">
            Inngest jobs <ExternalLink className="size-3.5" />
          </a>
          <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary">
            Stripe <ExternalLink className="size-3.5" />
          </a>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Users, label: "Users", value: data.totals.users },
          { icon: Activity, label: "Active (7d)", value: data.totals.activeUsers7d },
          { icon: UserPlus, label: "New (7d)", value: data.totals.newUsers7d },
          { icon: Crown, label: "Pro", value: data.totals.proUsers },
          { icon: Bot, label: "AI today", value: data.totals.aiRequestsToday },
          { icon: Bot, label: "AI (7d)", value: data.totals.aiRequests7d },
        ].map((t) => (
          <Card key={t.label} className="flex flex-col gap-1 p-3 md:p-4">
            <t.icon className="size-4 text-muted-foreground" aria-hidden />
            <span className="font-display text-2xl font-extrabold">{t.value.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">{t.label}</span>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardTitle>Sessions by activity</CardTitle>
          {data.sessionsByActivity.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
          <ul className="flex flex-col gap-2">
            {data.sessionsByActivity.map((s) => (
              <li key={s.activityId} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate">{humanizeCategory(s.activityId)}</span>
                <span className="h-3 overflow-hidden rounded-r bg-muted" title={`${s.count} sessions`}>
                  <span className="block h-full rounded-r bg-primary" style={{ width: `${(s.count / maxActivity) * 100}%` }} />
                </span>
                <span className="font-mono text-muted-foreground">{s.count}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="flex flex-col gap-3">
          <CardTitle>Most common mistakes</CardTitle>
          {data.topMistakes.length === 0 ? <p className="text-sm text-muted-foreground">No mistakes recorded this week.</p> : null}
          <div className="flex flex-wrap gap-2">
            {data.topMistakes.map((m) => (
              <Chip key={m.category} tone="mistake" className="px-3 py-1.5 text-sm">
                {humanizeCategory(m.category)} · {m.count}
              </Chip>
            ))}
          </div>
          <CardTitle className="mt-2">Heaviest AI use</CardTitle>
          <ul className="flex flex-col gap-1 text-sm">
            {data.topUsage.map((u) => (
              <li key={u.user.id} className="flex justify-between gap-3">
                <span className="truncate">{u.user.email ?? u.user.name ?? u.user.id}</span>
                <span className="font-mono">{u.requests}</span>
              </li>
            ))}
            {data.topUsage.length === 0 ? <li className="text-muted-foreground">No AI usage recorded (limits are tracked when accounts are on).</li> : null}
          </ul>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <CardTitle>Recent users</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-semibold">User</th>
                <th className="py-2 pr-3 font-semibold">Level</th>
                <th className="py-2 pr-3 font-semibold">Plan</th>
                <th className="py-2 pr-3 font-semibold">Role</th>
                <th className="py-2 pr-3 font-semibold">Joined</th>
                <th className="py-2 font-semibold">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.recentUsers.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 pr-3">
                    <span className="block font-semibold">{u.name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{u.email ?? u.id}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <LevelStamp level={u.cefrLevel} />
                  </td>
                  <td className="py-2 pr-3">
                    <Chip tone={u.plan === "pro" ? "correct" : "neutral"}>{u.plan}</Chip>
                  </td>
                  <td className="py-2 pr-3">{u.role}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{dateFmt(u.createdAt)}</td>
                  <td className="py-2 font-mono text-xs">{dateFmt(u.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
