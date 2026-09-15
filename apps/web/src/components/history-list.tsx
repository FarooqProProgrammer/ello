import { Card, CardTitle } from "@repo/ui";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

/** Past sessions of an activity (reading texts, dialogues, packs…). */
export function HistoryList({
  title,
  items,
}: {
  title: string;
  items: { id: string; href: string; title: string | null; meta: string; score: number | null }[];
}) {
  if (!items.length) return null;
  return (
    <Card className="flex flex-col gap-2">
      <CardTitle>{title}</CardTitle>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="flex items-center gap-3 py-3 hover:text-primary">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{item.title ?? "Untitled"}</span>
                <span className="text-xs text-muted-foreground">{item.meta}</span>
              </span>
              <span className="font-mono text-sm">{item.score !== null ? `${Math.round(item.score)}%` : "—"}</span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
