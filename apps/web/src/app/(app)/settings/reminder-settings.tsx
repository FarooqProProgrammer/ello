"use client";

import { Alert, Button, Card, CardTitle, cn } from "@repo/ui";
import { Bell, BellOff, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { postJson } from "@/lib/client";

const TIMES = Array.from({ length: 36 }, (_, i) => {
  const minutes = 6 * 60 + i * 30; // 06:00 → 23:30
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

const ZONES = ["Asia/Karachi", "Asia/Dubai", "Asia/Riyadh", "Asia/Kolkata", "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "Australia/Sydney"];

function base64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function ReminderSettings({
  enabled: initialEnabled,
  time: initialTime,
  timeZone: initialZone,
  vapidPublicKey,
}: {
  enabled: boolean;
  time: string;
  timeZone: string;
  vapidPublicKey: string | null;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [time, setTime] = useState(initialTime);
  const [timeZone, setTimeZone] = useState(initialZone);
  const [busy, setBusy] = useState<"toggle" | "test" | null>(null);
  const [message, setMessage] = useState<{ tone: "correct" | "mistake"; text: string } | null>(null);
  const [supported, setSupported] = useState(true);
  const zones = ZONES.includes(timeZone) ? ZONES : [timeZone, ...ZONES];

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
  }, []);

  async function save(update: Record<string, unknown>) {
    await postJson("/api/profile", update, "PATCH");
  }

  async function subscribe() {
    if (!vapidPublicKey) throw new Error("Push isn't set up on the server yet.");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notifications are blocked. Allow them for this site in your browser settings.");
    const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(vapidPublicKey) }));
    await postJson("/api/push/subscribe", subscription.toJSON());
  }

  async function toggle() {
    setBusy("toggle");
    setMessage(null);
    try {
      if (!enabled) {
        await subscribe();
        const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const zone = initialZone === "Asia/Karachi" && browserZone ? browserZone : timeZone;
        await save({ reminderEnabled: true, reminderTime: time, timeZone: zone });
        setTimeZone(zone);
        setEnabled(true);
        setMessage({ tone: "correct", text: "Reminders are on for this browser." });
      } else {
        await save({ reminderEnabled: false });
        setEnabled(false);
      }
    } catch (err) {
      setMessage({ tone: "mistake", text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    setMessage(null);
    try {
      await postJson("/api/push/test", {}, "POST", { retries: 0 });
      setMessage({ tone: "correct", text: "Test notification sent." });
    } catch (err) {
      setMessage({ tone: "mistake", text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="flex flex-col gap-5">
      <CardTitle className="flex items-center gap-2">
        <Bell className="size-5" /> Reminders
      </CardTitle>

      {!vapidPublicKey ? (
        <Alert tone="streak">
          Push notifications aren&apos;t set up. Run <code className="font-mono">pnpm vapid</code> and restart the dev server.
        </Alert>
      ) : null}
      {!supported ? <Alert>This browser doesn&apos;t support push notifications. Try Chrome, Edge or Firefox (or install the app on your phone).</Alert> : null}

      <div className="flex items-center justify-between gap-4">
        <span>
          <span className="block font-semibold">Daily practice reminder</span>
          <span className="text-sm text-muted-foreground">Only if you haven&apos;t practised yet. Streak-at-risk nudge at 9 PM.</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Daily practice reminder"
          disabled={busy !== null || !vapidPublicKey || !supported}
          onClick={toggle}
          className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50", enabled ? "bg-primary" : "bg-muted")}
        >
          <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-transform", enabled ? "translate-x-6" : "translate-x-1")} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Time</span>
          <select
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              if (enabled) void save({ reminderTime: e.target.value });
            }}
            className="h-11 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
          >
            {TIMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Time zone</span>
          <select
            value={timeZone}
            onChange={(e) => {
              setTimeZone(e.target.value);
              void save({ timeZone: e.target.value });
            }}
            className="h-11 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
          >
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      {enabled ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={test} loading={busy === "test"}>
            <Send className="size-4" /> Send test notification
          </Button>
          <Button size="sm" variant="ghost" onClick={toggle} loading={busy === "toggle"}>
            <BellOff className="size-4" /> Turn off
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
