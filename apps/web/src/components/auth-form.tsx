"use client";

import { Alert, Button, Card } from "@repo/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode, google }: { mode: "sign-in" | "sign-up"; google: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSignUp = mode === "sign-up";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    setError(null);
    const result = isSignUp
      ? await authClient.signUp.email({ name: name.trim() || email.split("@")[0]!, email, password })
      : await authClient.signIn.email({ email, password });
    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.");
      setBusy(null);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function withGoogle() {
    setBusy("google");
    setError(null);
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed.");
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-primary font-display text-3xl font-extrabold text-primary-foreground">“</span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{isSignUp ? "Create your account" : "Welcome back"}</h1>
        <p className="text-muted-foreground">{isSignUp ? "Start speaking English with confidence." : "Sign in to continue learning."}</p>
      </div>

      <Card className="flex flex-col gap-4">
        {google ? (
          <>
            <Button variant="secondary" onClick={withGoogle} loading={busy === "google"} disabled={busy !== null}>
              Continue with Google
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
          </>
        ) : null}

        <form onSubmit={submit} className="flex flex-col gap-3">
          {isSignUp ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="h-11 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" />
            </label>
          ) : null}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-11 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="h-11 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
            />
          </label>
          {error ? <Alert>{error}</Alert> : null}
          <Button type="submit" size="lg" loading={busy === "email"} disabled={busy !== null}>
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account? " : "New here? "}
        <Link href={isSignUp ? "/sign-in" : "/sign-up"} className="font-semibold text-primary">
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </main>
  );
}
