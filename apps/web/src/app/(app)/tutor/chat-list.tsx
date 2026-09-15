"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Button as ShadButton } from "@repo/ui/components/button";
import { cn } from "@repo/ui";
import { Check, MessageCircle, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { postJson, toError } from "@/lib/client";
import type { ChatSummary } from "./data";

function groupLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= startOfToday) return "Today";
  if (t >= startOfToday - 86_400_000) return "Yesterday";
  if (t >= startOfToday - 7 * 86_400_000) return "Previous 7 days";
  if (t >= startOfToday - 30 * 86_400_000) return "Previous 30 days";
  return "Older";
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

/** ChatGPT-style list of saved tutor chats, grouped by recency, with rename and delete. */
export function ChatList({ chats: initialChats, activeId }: { chats: ChatSummary[]; activeId?: string | null }) {
  const router = useRouter();
  const [chats, setChats] = useState(initialChats);
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState<ChatSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, ChatSummary[]>();
    for (const chat of chats) {
      const label = groupLabel(chat.lastMessageAt);
      map.set(label, [...(map.get(label) ?? []), chat]);
    }
    return [...map.entries()];
  }, [chats]);

  async function saveTitle() {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) return setEditing(null);
    setError(null);
    try {
      await postJson(`/api/tutor/${editing.id}`, { title }, "PATCH");
      setChats((cs) => cs.map((c) => (c.id === editing.id ? { ...c, title } : c)));
      setEditing(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tutor/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw await toError(res);
      setChats((cs) => cs.filter((c) => c.id !== deleting.id));
      if (deleting.id === activeId) router.push("/tutor");
      setDeleting(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (chats.length === 0) return null;

  return (
    <section aria-labelledby="chat-history-title" className="flex flex-col gap-3">
      <h2 id="chat-history-title" className="font-display text-xl font-bold">
        Your chats
      </h2>
      {error ? <p className="text-sm text-mistake">{error}</p> : null}
      {groups.map(([label, items]) => (
        <div key={label} className="flex flex-col gap-1">
          <p className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card">
            {items.map((chat) => (
              <li key={chat.id} className={cn("group relative flex items-center gap-3 px-4 py-3", chat.id === activeId && "bg-primary-soft")}>
                <MessageCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {editing?.id === chat.id ? (
                  <form
                    className="flex min-w-0 flex-1 items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveTitle();
                    }}
                  >
                    <input
                      autoFocus
                      value={editing.title}
                      maxLength={80}
                      onChange={(e) => setEditing({ id: chat.id, title: e.target.value })}
                      onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                      aria-label="Chat title"
                      className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary"
                    />
                    <button type="submit" className="grid size-8 place-items-center rounded-full hover:bg-muted" aria-label="Save title">
                      <Check className="size-4" />
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="grid size-8 place-items-center rounded-full hover:bg-muted" aria-label="Cancel">
                      <X className="size-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    <Link href={`/tutor/${chat.id}`} className="min-w-0 flex-1 after:absolute after:inset-0">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-semibold">{chat.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{timeLabel(chat.lastMessageAt)}</span>
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {chat.topicLabel ? `${chat.topicLabel} · ` : ""}
                        {chat.preview}
                      </span>
                    </Link>
                    <div className="relative z-10 flex shrink-0 gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => setEditing({ id: chat.id, title: chat.title })}
                        className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={`Rename ${chat.title}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(chat)}
                        className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-mistake-soft hover:text-mistake"
                        aria-label={`Delete ${chat.title}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” and its messages will be deleted. Words already added to your flashcards stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <ShadButton variant="destructive" onClick={() => void confirmDelete()} disabled={busy}>
              {busy ? "Deleting…" : "Delete"}
            </ShadButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
