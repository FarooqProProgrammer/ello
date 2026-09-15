import { Alert } from "@repo/ui";

/** Shown when the database isn't reachable, instead of a crash page. */
export function DatabaseNotice({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="mb-4 font-display text-3xl font-extrabold">Almost ready</h1>
      <Alert tone="streak">
        <p className="font-semibold">The database isn't reachable.</p>
        <p className="mt-1 text-muted-foreground">{message}</p>
      </Alert>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm">
        <li>
          Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env</code>
        </li>
        <li>
          Start Postgres: <code className="font-mono">pnpm db:up</code>
        </li>
        <li>
          Create tables: <code className="font-mono">pnpm db:migrate</code>
        </li>
        <li>Reload this page.</li>
      </ol>
    </main>
  );
}
