"use client";

import { Alert, Button } from "@repo/ui";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { postJson } from "@/lib/client";

export function BillingActions({ plan, billing, hasCustomer }: { plan: string; billing: boolean; hasCustomer: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(endpoint: string) {
    setBusy(true);
    setError(null);
    try {
      const { url } = await postJson<{ url: string }>(endpoint, {}, "POST", { retries: 0 });
      window.location.href = url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (!billing) {
    return <p className="text-sm text-muted-foreground">Billing isn&apos;t configured. Add STRIPE_SECRET_KEY, STRIPE_PRICE_PRO and STRIPE_WEBHOOK_SECRET to .env.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {plan === "pro" || hasCustomer ? (
        <div className="flex flex-wrap gap-2">
          {plan !== "pro" ? (
            <Button onClick={() => go("/api/billing/checkout")} loading={busy}>
              <Sparkles className="size-4" /> Upgrade to Pro
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => go("/api/billing/portal")} loading={busy}>
            Manage subscription
          </Button>
        </div>
      ) : (
        <Button onClick={() => go("/api/billing/checkout")} loading={busy} className="self-start">
          <Sparkles className="size-4" /> Upgrade to Pro
        </Button>
      )}
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}
