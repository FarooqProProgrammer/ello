"use client";

import { Button } from "@repo/ui";
import { RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client";

export function GenerateReportButton({ hasThisWeek }: { hasThisWeek: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const { id } = await postJson<{ id: string }>("/api/reports", { force: hasThisWeek });
      router.push(`/reports?id=${id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant={hasThisWeek ? "secondary" : "primary"} onClick={generate} loading={busy}>
        {hasThisWeek ? <RefreshCw className="size-4" /> : <Sparkles className="size-4" />}
        {busy ? "Writing report…" : hasThisWeek ? "Refresh this week" : "Generate now"}
      </Button>
      {error ? <p className="text-xs text-mistake">{error}</p> : null}
    </div>
  );
}
