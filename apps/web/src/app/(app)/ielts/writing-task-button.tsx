"use client";

import { Button } from "@repo/ui";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client";

export function WritingTaskButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const { question } = await postJson<{ question: string }>("/api/ielts/writing-task", {});
      router.push(`/writing?type=ielts-task2&task=${encodeURIComponent(question)}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={go} loading={busy} disabled={disabled} className="self-start">
        <Sparkles className="size-4" /> Give me a Task 2 question
      </Button>
      {error ? <p className="text-sm text-mistake">{error}</p> : null}
    </div>
  );
}
