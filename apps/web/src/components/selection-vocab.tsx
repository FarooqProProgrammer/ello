"use client";

import { cleanSelection } from "@repo/core";
import { Button, Chip, cn } from "@repo/ui";
import { speakInBrowser } from "@repo/voice/browser";
import { BookmarkPlus, Check, Layers, LoaderCircle, RotateCcw, Volume2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { postJson } from "@/lib/client";
import type { TranslationLanguage } from "@/lib/labels";

interface Entry {
  id: string;
  term: string;
  partOfSpeech: string | null;
  definition: string;
  translation: string | null;
  usageNote: string | null;
  usageNative: string | null;
  example: string | null;
  alreadyExisted: boolean;
  language: TranslationLanguage;
}

interface Point {
  x: number;
  y: number;
}

type CardState = (Point & { text: string; context: string }) &
  ({ status: "loading" } | { status: "done"; entry: Entry } | { status: "error"; message: string });

const CARD_WIDTH = 340;

/** Surrounding sentence/paragraph of the selection, so the AI explains the meaning in context. */
function selectionContext(selection: Selection): string {
  const node = selection.anchorNode;
  const el = node instanceof Element ? node : node?.parentElement;
  const block = el?.closest("p, li, blockquote, td, h1, h2, h3, [data-slot], div");
  return (block?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
}

function isEditable(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

/**
 * App-wide: select an English word → right-click → "Add to vocabulary".
 * On touch devices a floating button appears for the selection instead.
 */
export function SelectionVocab() {
  const [menu, setMenu] = useState<(Point & { text: string; context: string }) | null>(null);
  const [card, setCard] = useState<CardState | null>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  const closeAll = useCallback(() => {
    setMenu(null);
    setCard(null);
  }, []);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.("[data-vocab-ui]") || isEditable(e.target)) return;
      const selection = window.getSelection();
      const text = selection ? cleanSelection(selection.toString()) : null;
      if (!selection || !text) return; // no selection → keep the browser's normal menu
      e.preventDefault();
      setCard(null);
      setMenu({ x: e.clientX, y: e.clientY, text, context: selectionContext(selection) });
    };

    // Touch devices have no right-click: offer a button under the selection.
    const coarse = window.matchMedia("(pointer: coarse)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onSelectionChange = () => {
      if (!coarse.matches) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection ? cleanSelection(selection.toString()) : null;
        if (!selection || !text || selection.rangeCount === 0 || isEditable(selection.anchorNode?.parentElement ?? null)) {
          setMenu((m) => (m ? null : m));
          return;
        }
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        setMenu({ x: rect.left + rect.width / 2 - 90, y: rect.bottom + 10, text, context: selectionContext(selection) });
      }, 400);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.("[data-vocab-ui]")) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeAll();
    const onScroll = () => setMenu(null);

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [closeAll]);

  useEffect(() => {
    if (menu) firstItemRef.current?.focus({ preventScroll: true });
  }, [menu]);

  async function lookup(target: Point & { text: string; context: string }) {
    setCard({ ...target, status: "loading" });
    try {
      const entry = await postJson<Entry>("/api/vocab/smart", { text: target.text, context: target.context });
      setCard({ ...target, status: "done", entry });
    } catch (err) {
      setCard({ ...target, status: "error", message: (err as Error).message });
    }
  }

  function addToVocab() {
    if (!menu) return;
    setMenu(null);
    void lookup(menu);
  }

  const clamp = (p: Point, width: number, height: number) => ({
    left: Math.max(8, Math.min(p.x, window.innerWidth - width - 8)),
    top: Math.max(8, Math.min(p.y, window.innerHeight - height - 8)),
  });

  return (
    <>
      {menu ? (
        <div
          data-vocab-ui
          role="menu"
          aria-label={`Actions for “${menu.text}”`}
          className="fixed z-[60] w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          style={clamp(menu, 224, 96)}
        >
          <p className="truncate px-3 pb-1 pt-2 text-xs text-muted-foreground">“{menu.text}”</p>
          <button
            ref={firstItemRef}
            role="menuitem"
            type="button"
            onClick={addToVocab}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <BookmarkPlus className="size-4 text-primary" /> Add to dictionary
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              speakInBrowser(menu.text);
              setMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <Volume2 className="size-4 text-muted-foreground" /> Pronounce
          </button>
        </div>
      ) : null}

      {card ? (
        <div
          data-vocab-ui
          role="dialog"
          aria-label={`Vocabulary: ${card.text}`}
          className="fixed z-[60] flex max-h-[80dvh] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl"
          style={{ width: `min(${CARD_WIDTH}px, calc(100vw - 16px))`, ...clamp(card, Math.min(CARD_WIDTH, window.innerWidth - 16), 380) }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="highlighter font-display text-2xl font-extrabold leading-tight">
                {card.status === "done" ? card.entry.term : card.text}
              </p>
              {card.status === "done" && card.entry.partOfSpeech ? (
                <p className="mt-1 font-mono text-xs text-muted-foreground">{card.entry.partOfSpeech}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => speakInBrowser(card.status === "done" ? card.entry.term : card.text)}
                className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary"
                aria-label="Pronounce"
              >
                <Volume2 className="size-4" />
              </button>
              <button type="button" onClick={() => setCard(null)} className="grid size-8 place-items-center rounded-full hover:bg-muted" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
          </div>

          {card.status === "loading" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Looking it up and adding it to your dictionary…
            </p>
          ) : null}

          {card.status === "error" ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-mistake">{card.message}</p>
              <Button size="sm" variant="secondary" onClick={() => void lookup(card)}>
                <RotateCcw className="size-4" /> Try again
              </Button>
            </div>
          ) : null}

          {card.status === "done" ? <EntryDetails entry={card.entry} /> : null}
        </div>
      ) : null}
    </>
  );
}

function EntryDetails({ entry }: { entry: Entry }) {
  const nativeClass = (extra: string) =>
    cn(entry.language.code === "ur" ? "font-urdu leading-[2.1]" : "leading-relaxed", extra);

  return (
    <>
      <p className="text-[15px]">{entry.definition}</p>

      {entry.translation ? (
        <div className="rounded-xl bg-muted px-3 py-2">
          <p className="text-xs font-semibold text-muted-foreground">{entry.language.name}</p>
          <p lang={entry.language.code} dir={entry.language.rtl ? "rtl" : "ltr"} className={nativeClass("text-lg font-semibold")}>
            {entry.translation}
          </p>
        </div>
      ) : null}

      {entry.usageNote || entry.usageNative ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">When to use it</p>
          {entry.usageNote ? <p className="text-sm">{entry.usageNote}</p> : null}
          {entry.usageNative ? (
            <p lang={entry.language.code} dir={entry.language.rtl ? "rtl" : "ltr"} className={nativeClass("text-[15px] text-muted-foreground")}>
              {entry.usageNative}
            </p>
          ) : null}
        </div>
      ) : null}

      {entry.example ? <p className="rounded-xl border-l-4 border-l-highlight bg-highlight-soft px-3 py-2 text-sm italic">“{entry.example}”</p> : null}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <Chip tone="correct">
          <Check className="size-3" /> {entry.alreadyExisted ? "Updated in dictionary" : "Added to dictionary"}
        </Chip>
        <Link href={`/dictionary?q=${encodeURIComponent(entry.term)}`}>
          <Button size="sm" variant="ghost">
            <Layers className="size-4" /> Open dictionary
          </Button>
        </Link>
      </div>
    </>
  );
}
