import { aiRequestsToday } from "@repo/db";
import { Alert, Card, CardTitle, Chip, ProgressBar } from "@repo/ui";
import { Check, CreditCard } from "lucide-react";
import { dailyAiLimit } from "@/lib/ai-env";
import { authEnabled } from "@/lib/auth";
import { billingEnabled } from "@/lib/billing";
import { requirePageUser } from "@/lib/current-user";
import { BillingActions } from "./billing-actions";

const PRO_FEATURES = ["More AI requests every day", "Unlimited writing and IELTS feedback", "Priority on new features"];

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ success?: string; canceled?: string }> }) {
  const { success, canceled } = await searchParams;
  const user = await requirePageUser();
  const used = await aiRequestsToday(user.id);
  const limit = dailyAiLimit(user.plan);
  const accounts = authEnabled();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <CreditCard className="size-7 text-primary" /> Plan & billing
        </h1>
      </header>

      {success ? <Alert tone="correct">Thanks! Your Pro plan is being activated — it can take a few seconds.</Alert> : null}
      {canceled ? <Alert tone="streak">Checkout was canceled. You haven&apos;t been charged.</Alert> : null}
      {!accounts ? (
        <Alert tone="streak">Single-user mode: there are no limits. Plans and billing apply once accounts are enabled (BETTER_AUTH_SECRET).</Alert>
      ) : null}

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Current plan</CardTitle>
          <Chip tone={user.plan === "pro" ? "correct" : "neutral"} className="px-3 py-1 text-sm">
            {user.plan === "pro" ? "Pro" : "Free"}
          </Chip>
        </div>
        {user.plan === "pro" && user.planRenewsAt ? (
          <p className="text-sm text-muted-foreground">Renews on {user.planRenewsAt.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</p>
        ) : null}
        {accounts ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">AI requests today</span>
              <span className="font-mono">
                {used} / {limit}
              </span>
            </div>
            <ProgressBar value={(used / limit) * 100} color={used >= limit ? "var(--mistake)" : "var(--primary)"} label="AI requests used today" />
            <p className="text-xs text-muted-foreground">Resets daily at midnight UTC. Every tutor reply, correction, translation and AI exercise counts as one request.</p>
          </div>
        ) : null}
        <BillingActions plan={user.plan} billing={billingEnabled() && accounts} hasCustomer={Boolean(user.stripeCustomerId)} />
      </Card>

      {user.plan !== "pro" ? (
        <Card className="flex flex-col gap-3 border-primary/40">
          <CardTitle>Pro</CardTitle>
          <ul className="flex flex-col gap-2">
            {PRO_FEATURES.map((f, i) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-correct" /> {i === 0 ? `${dailyAiLimit("pro")} AI requests every day` : f}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </main>
  );
}
