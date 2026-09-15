"use client";

import { Button, Card, CardTitle, Chip } from "@repo/ui";
import { CreditCard, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AccountSettings({
  accounts,
  email,
  plan,
  admin,
}: {
  accounts: boolean;
  email: string | null;
  plan: string;
  admin: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4">
      <CardTitle className="flex items-center gap-2">
        <UserRound className="size-5" /> Account
      </CardTitle>
      {accounts ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            <span className="block text-sm text-muted-foreground">Signed in as</span>
            <span className="font-semibold">{email ?? "—"}</span>
          </span>
          <Button variant="secondary" size="sm" onClick={signOut} loading={busy}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Single-user mode — no sign-in needed. Set <code className="font-mono">BETTER_AUTH_SECRET</code> in .env to turn on accounts; the first account you create keeps all current progress.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href="/billing">
          <Button variant="soft" size="sm">
            <CreditCard className="size-4" /> Plan & billing <Chip className="ml-1">{plan === "pro" ? "Pro" : "Free"}</Chip>
          </Button>
        </Link>
        {admin ? (
          <Link href="/admin">
            <Button variant="soft" size="sm">
              <ShieldCheck className="size-4" /> Admin
            </Button>
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
