"use client";

import type { AiSettingsView } from "@repo/db";
import { Alert, Button, Card, CardTitle, Chip, cn } from "@repo/ui";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@repo/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Check, ChevronsUpDown, Cpu, Eye, EyeOff, KeyRound, LoaderCircle, RotateCcw, TriangleAlert, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ClientApiError, postJson } from "@/lib/client";

type Role = "tutor" | "grader" | "generator";
type Provider = "anthropic" | "openai";

interface Defaults {
  anthropicKey: boolean;
  openaiKey: boolean;
  openaiBaseUrl: string | null;
  routes: Record<Role, string>;
  voiceProvider: "openai" | "browser";
}

const ROLES: { id: Role; title: string; help: string }[] = [
  { id: "tutor", title: "Tutor conversation", help: "Streams the tutor's replies" },
  { id: "grader", title: "Corrections & grading", help: "Finds mistakes and scores messages" },
  { id: "generator", title: "Content generation", help: "Exercises and explanations" },
];

const SUGGESTED: Record<Provider, string[]> = {
  anthropic: ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5", "claude-fable-5-1"],
  openai: [],
};

type TestState = { status: "idle" } | { status: "testing" } | { status: "ok"; ms: number; count: number } | { status: "error"; message: string };

function splitRoute(route: string): { provider: Provider; model: string } {
  const i = route.indexOf(":");
  const provider = route.slice(0, i) === "openai" ? "openai" : "anthropic";
  return { provider, model: i === -1 ? "" : route.slice(i + 1) };
}

export function AiSettings({
  saved: initialSaved,
  defaults,
  secretConfigured,
  configError,
}: {
  saved: AiSettingsView;
  defaults: Defaults;
  secretConfigured: boolean;
  configError: string | null;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [keys, setKeys] = useState<Record<Provider, string>>({ anthropic: "", openai: "" });
  const [clearKey, setClearKey] = useState<Record<Provider, boolean>>({ anthropic: false, openai: false });
  const [baseUrl, setBaseUrl] = useState(initialSaved.openai.baseUrl ?? "");
  const [routes, setRoutes] = useState<Record<Role, string | null>>(initialSaved.routes);
  const [voice, setVoice] = useState<"openai" | "browser" | null>(initialSaved.voiceProvider);
  const [tests, setTests] = useState<Record<Provider, TestState>>({ anthropic: { status: "idle" }, openai: { status: "idle" } });
  const [models, setModels] = useState<Record<Provider, string[]>>({ anthropic: [], openai: [] });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "correct" | "mistake"; text: string } | null>(null);

  const dirty =
    keys.anthropic.trim() !== "" ||
    keys.openai.trim() !== "" ||
    clearKey.anthropic ||
    clearKey.openai ||
    baseUrl.trim() !== (saved.openai.baseUrl ?? "") ||
    JSON.stringify(routes) !== JSON.stringify(saved.routes) ||
    voice !== saved.voiceProvider;

  const requestIds = useRef<Record<Provider, number>>({ anthropic: 0, openai: 0 });

  async function test(provider: Provider) {
    const requestId = ++requestIds.current[provider];
    setTests((t) => ({ ...t, [provider]: { status: "testing" } }));
    try {
      const res = await postJson<{ ok: boolean; ms?: number; models?: string[]; error?: string }>("/api/settings/ai/test", {
        provider,
        ...(keys[provider].trim() ? { apiKey: keys[provider].trim() } : {}),
        ...(provider === "openai" ? { baseUrl: baseUrl.trim() || null } : {}),
      });
      // Ignore responses from older requests (e.g. while the user is still typing a URL).
      if (requestId !== requestIds.current[provider]) return;
      if (res.ok) {
        setModels((m) => ({ ...m, [provider]: res.models ?? [] }));
        setTests((t) => ({ ...t, [provider]: { status: "ok", ms: res.ms ?? 0, count: res.models?.length ?? 0 } }));
      } else {
        setTests((t) => ({ ...t, [provider]: { status: "error", message: res.error ?? "Connection failed." } }));
      }
    } catch (err) {
      if (requestId !== requestIds.current[provider]) return;
      setTests((t) => ({ ...t, [provider]: { status: "error", message: (err as Error).message } }));
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...(keys.anthropic.trim() ? { anthropicApiKey: keys.anthropic.trim() } : clearKey.anthropic ? { anthropicApiKey: null } : {}),
        ...(keys.openai.trim() ? { openaiApiKey: keys.openai.trim() } : clearKey.openai ? { openaiApiKey: null } : {}),
        openaiBaseUrl: baseUrl.trim() || null,
        routes,
        voiceProvider: voice,
      };
      const next = await postJson<AiSettingsView>("/api/settings/ai", payload, "PUT");
      setSaved(next);
      setRoutes(next.routes);
      setVoice(next.voiceProvider);
      setKeys({ anthropic: "", openai: "" });
      setClearKey({ anthropic: false, openai: false });
      setMessage({ tone: "correct", text: "AI settings saved." });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "mistake", text: err instanceof ClientApiError ? err.message : "Couldn't save settings." });
    } finally {
      setSaving(false);
    }
  }

  const providerConnected = (p: Provider) =>
    !clearKey[p] && (keys[p].trim() !== "" || saved[p].hasKey || (p === "anthropic" ? defaults.anthropicKey : defaults.openaiKey || Boolean(baseUrl.trim() || defaults.openaiBaseUrl)));

  // Mirrors fillMissingRoutes on the server: the first role with a connected provider lends its model to the rest.
  const fallbackRole = ROLES.map((r) => r.id).find((id) => providerConnected(splitRoute(routes[id] ?? defaults.routes[id]).provider));

  // Load model lists automatically: immediately on open, debounced while a key or base URL is being edited.
  const typedKeyTooShort = (p: Provider) => keys[p].trim() !== "" && keys[p].trim().length < 20;
  useEffect(() => {
    if (!providerConnected("anthropic") || typedKeyTooShort("anthropic")) return;
    const timer = setTimeout(() => void test("anthropic"), keys.anthropic.trim() ? 700 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.anthropic, clearKey.anthropic]);
  useEffect(() => {
    if (!providerConnected("openai") || typedKeyTooShort("openai")) return;
    const editing = keys.openai.trim() !== "" || baseUrl !== (saved.openai.baseUrl ?? "");
    const timer = setTimeout(() => void test("openai"), editing ? 700 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.openai, baseUrl, clearKey.openai]);

  return (
    <Card className="flex flex-col gap-6">
      <CardTitle className="flex items-center gap-2">
        <Cpu className="size-5" /> AI models
      </CardTitle>

      {configError ? <Alert>{configError}</Alert> : null}
      {!secretConfigured ? (
        <Alert tone="streak">
          Add <code className="font-mono">APP_SECRET</code> to <code className="font-mono">.env</code> to save API keys here. Model and base URL changes still work.
        </Alert>
      ) : null}
      {saved.unreadableKeys ? (
        <Alert>A saved key can&apos;t be decrypted (APP_SECRET changed). Enter the key again.</Alert>
      ) : null}

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Providers</h3>

        <ProviderCard
          title="Anthropic"
          subtitle="Claude models"
          status={statusChip(saved.anthropic.hasKey && !clearKey.anthropic, defaults.anthropicKey, tests.anthropic)}
        >
          <KeyInput
            label="API key"
            value={keys.anthropic}
            onChange={(v) => {
              setKeys((k) => ({ ...k, anthropic: v }));
              setTests((t) => ({ ...t, anthropic: { status: "idle" } }));
            }}
            placeholder={saved.anthropic.hint ?? (defaults.anthropicKey ? "Using key from .env" : "sk-ant-…")}
            disabled={!secretConfigured}
          />
          <ProviderActions
            test={tests.anthropic}
            onTest={() => test("anthropic")}
            canTest={providerConnected("anthropic")}
            canClear={saved.anthropic.hasKey}
            cleared={clearKey.anthropic}
            onClear={() => setClearKey((c) => ({ ...c, anthropic: !c.anthropic }))}
          />
        </ProviderCard>

        <ProviderCard
          title="OpenAI / compatible"
          subtitle="OpenAI, OpenRouter, Groq, Ollama, vLLM…"
          status={statusChip(saved.openai.hasKey && !clearKey.openai, defaults.openaiKey, tests.openai)}
        >
          <KeyInput
            label="API key"
            value={keys.openai}
            onChange={(v) => {
              setKeys((k) => ({ ...k, openai: v }));
              setTests((t) => ({ ...t, openai: { status: "idle" } }));
            }}
            placeholder={saved.openai.hint ?? (defaults.openaiKey ? "Using key from .env" : "sk-… (optional for local servers)")}
            disabled={!secretConfigured}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Base URL</span>
            <input
              type="url"
              inputMode="url"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setTests((t) => ({ ...t, openai: { status: "idle" } }));
              }}
              placeholder={defaults.openaiBaseUrl ?? "https://api.openai.com/v1 (default)"}
              className="h-11 min-w-0 rounded-xl border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary"
            />
            <span className="text-xs text-muted-foreground">Leave empty for OpenAI. Examples: https://openrouter.ai/api/v1 · http://localhost:11434/v1</span>
          </label>
          <ProviderActions
            test={tests.openai}
            onTest={() => test("openai")}
            canTest={providerConnected("openai")}
            canClear={saved.openai.hasKey}
            cleared={clearKey.openai}
            onClear={() => setClearKey((c) => ({ ...c, openai: !c.openai }))}
          />
        </ProviderCard>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Model per role</h3>
        <ul className="divide-y divide-border">
          {ROLES.map((role) => {
            const effective = routes[role.id] ?? defaults.routes[role.id];
            const { provider, model } = splitRoute(effective);
            const overridden = routes[role.id] !== null;
            const setRoute = (p: Provider, m: string) => setRoutes((r) => ({ ...r, [role.id]: `${p}:${m}` }));
            return (
              <li key={role.id} className="flex flex-col gap-3 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{role.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {role.help} · {overridden ? "set here" : "from .env"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!providerConnected(provider) ? (
                      fallbackRole && fallbackRole !== role.id ? (
                        <Chip tone="primary" className="whitespace-nowrap" title={`No ${provider} key — uses ${routes[fallbackRole] ?? defaults.routes[fallbackRole]}`}>
                          Uses {ROLES.find((r) => r.id === fallbackRole)?.title.split(" ")[0]?.toLowerCase()} model
                        </Chip>
                      ) : (
                        <Chip tone="mistake" className="whitespace-nowrap">
                          <TriangleAlert className="size-3" /> No key
                        </Chip>
                      )
                    ) : null}
                    {overridden ? (
                      <button
                        type="button"
                        onClick={() => setRoutes((r) => ({ ...r, [role.id]: null }))}
                        className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                        aria-label="Use .env default"
                        title={`Use .env default (${defaults.routes[role.id]})`}
                      >
                        <RotateCcw className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[12.5rem_minmax(0,1fr)]">
                  <select
                    value={provider}
                    onChange={(e) => {
                      const p = e.target.value as Provider;
                      setRoute(p, models[p][0] ?? SUGGESTED[p][0] ?? "");
                    }}
                    className="h-11 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
                    aria-label={`${role.title} provider`}
                  >
                    <option value="anthropic">Anthropic</option>
                    <option value="openai">OpenAI / compatible</option>
                  </select>
                  <ModelCombobox
                    value={model}
                    options={models[provider].length ? models[provider] : SUGGESTED[provider]}
                    loading={tests[provider].status === "testing"}
                    error={tests[provider].status === "error" ? tests[provider].message : null}
                    onChange={(m) => setRoute(provider, m)}
                    label={`${role.title} model`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          Models load automatically from each provider (for OpenAI-compatible, from the base URL). You can also type any model id.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Volume2 className="size-4" /> Voice engine
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["browser", "Browser speech", "Free, works offline in most browsers"],
              ["openai", "OpenAI speech", "Better recognition & voices · needs OpenAI key"],
            ] as const
          ).map(([id, title, help]) => {
            const active = (voice ?? defaults.voiceProvider) === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setVoice(id)}
                className={cn("rounded-xl border-2 p-3 text-left", active ? "border-primary bg-primary-soft" : "border-border")}
              >
                <span className="flex items-center justify-between font-semibold">
                  {title} {active ? <Check className="size-4 text-primary" /> : null}
                </span>
                <span className="text-xs text-muted-foreground">{help}</span>
              </button>
            );
          })}
        </div>
      </section>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <KeyRound className="size-4 shrink-0" />
          <span>Keys are encrypted and never shown again. Saved values override .env.</span>
        </p>
        <Button onClick={save} loading={saving} disabled={!dirty}>
          Save AI settings
        </Button>
      </div>
    </Card>
  );
}

function statusChip(savedKey: boolean, envKey: boolean, test: TestState) {
  if (test.status === "ok") {
    return (
      <Chip tone="correct" className="whitespace-nowrap">
        <Check className="size-3" /> Connected · {test.ms}ms
      </Chip>
    );
  }
  if (test.status === "error") {
    return (
      <Chip tone="mistake" className="whitespace-nowrap">
        <TriangleAlert className="size-3" /> Failed
      </Chip>
    );
  }
  if (savedKey) return <Chip tone="primary" className="whitespace-nowrap">Key saved</Chip>;
  if (envKey) return <Chip className="whitespace-nowrap">Key in .env</Chip>;
  return <Chip className="whitespace-nowrap">Not set</Chip>;
}

function ProviderCard({ title, subtitle, status, children }: { title: string; subtitle: string; status: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="shrink-0">{status}</div>
      </div>
      {children}
    </div>
  );
}

function KeyInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="flex min-w-0 items-center rounded-xl border border-border bg-background focus-within:border-primary">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="grid size-10 place-items-center text-muted-foreground"
          aria-label={show ? "Hide key" : "Show key"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function ProviderActions({
  test,
  onTest,
  canTest,
  canClear,
  cleared,
  onClear,
}: {
  test: TestState;
  onTest: () => void;
  canTest: boolean;
  canClear: boolean;
  cleared: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onTest} loading={test.status === "testing"} disabled={!canTest}>
          Test connection
        </Button>
        {canClear ? (
          <Button variant="ghost" size="sm" onClick={onClear} className={cn(cleared && "text-mistake")}>
            {cleared ? "Undo remove" : "Remove saved key"}
          </Button>
        ) : null}
        {test.status === "ok" ? <span className="text-xs text-muted-foreground">{test.count} models found</span> : null}
      </div>
      {test.status === "error" ? <p className="text-sm text-mistake">{test.message}</p> : null}
      {cleared ? <p className="text-xs text-muted-foreground">The saved key will be removed when you save.</p> : null}
    </div>
  );
}

/** Searchable model picker (shadcn Popover + Command) that also accepts a custom model id. */
function ModelCombobox({
  value,
  options,
  loading,
  error,
  onChange,
  label,
}: {
  value: string;
  options: string[];
  loading: boolean;
  error: string | null;
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const typed = query.trim();
  const choose = (model: string) => {
    onChange(model);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        className="flex h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 text-left font-mono text-sm outline-none focus-visible:border-primary"
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>{value || (loading ? "Loading models…" : "Choose a model")}</span>
        {loading ? <LoaderCircle className="size-4 shrink-0 animate-spin" /> : <ChevronsUpDown className="size-4 shrink-0 opacity-50" />}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-72 p-0">
        {/* We filter ourselves so only the visible rows are ever mounted. */}
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or type a model id…" value={query} onValueChange={setQuery} />
          {typed && !options.includes(typed) ? (
            <CommandGroup heading="Custom">
              <CommandItem value={`custom:${typed}`} onSelect={() => choose(typed)} className="font-mono text-xs">
                Use “{typed}”
              </CommandItem>
            </CommandGroup>
          ) : null}
          <VirtualModelList
            options={options}
            query={typed}
            value={value}
            onChoose={choose}
            emptyText={loading ? "Loading models…" : error ?? "No models found."}
          />
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const ROW_HEIGHT = 32;

/** Model rows rendered with TanStack Virtual; mounts with the popover so the scroll element exists. */
function VirtualModelList({
  options,
  query,
  value,
  onChoose,
  emptyText,
}: {
  options: string[];
  query: string;
  value: string;
  onChoose: (model: string) => void;
  emptyText: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  // Open with the current model in view.
  useEffect(() => {
    const index = value ? filtered.indexOf(value) : -1;
    if (index > 0) virtualizer.scrollToIndex(index, { align: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {filtered.length ? (
        <p className="px-3 pt-2 text-xs text-muted-foreground">
          {query ? `${filtered.length} of ${options.length}` : options.length} model{options.length === 1 ? "" : "s"}
        </p>
      ) : null}
      <CommandList ref={listRef} className="max-h-72 p-1">
        <CommandEmpty>{emptyText}</CommandEmpty>
        {filtered.length ? (
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((row) => {
              const model = filtered[row.index]!;
              return (
                <CommandItem
                  key={model}
                  value={model}
                  data-checked={model === value}
                  onSelect={() => onChoose(model)}
                  className="absolute inset-x-0 top-0 font-mono text-xs"
                  style={{ height: row.size, transform: `translateY(${row.start}px)` }}
                >
                  <span className="truncate">{model}</span>
                </CommandItem>
              );
            })}
          </div>
        ) : null}
      </CommandList>
    </>
  );
}
