import { AI_ROLES, formatModelRoute, loadEnv, routeForRole } from "@repo/config";
import { getAiSettingsView, listMemories } from "@repo/db";
import { authEnabled } from "@/lib/auth";
import { isAdmin, requirePageUser as getCurrentUser } from "@/lib/current-user";
import { AccountSettings } from "./account-settings";
import { AiSettings } from "./ai-settings";
import { MemorySettings } from "./memory-settings";
import { ReminderSettings } from "./reminder-settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  let env;
  let configError: string | null = null;
  try {
    env = loadEnv();
  } catch (err) {
    configError = (err as Error).message;
    env = loadEnv({});
  }
  const [saved, memories] = await Promise.all([getAiSettingsView(user.id, env.APP_SECRET), listMemories(user.id)]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Settings</h1>
      <AccountSettings accounts={authEnabled()} email={user.email} plan={user.plan} admin={isAdmin(user)} />
      <SettingsForm
        profile={{
          name: user.name,
          nativeLanguage: user.nativeLanguage,
          explainInNative: user.explainInNative,
          cefrLevel: user.cefrLevel,
          goals: user.goals,
          voiceEnabled: user.voiceEnabled,
        }}
      />
      <ReminderSettings
        enabled={user.reminderEnabled}
        time={user.reminderTime}
        timeZone={user.timeZone}
        vapidPublicKey={process.env.VAPID_PUBLIC_KEY || null}
      />
      <MemorySettings
        enabled={user.memoryEnabled}
        memories={memories.map((m) => ({ ...m, updatedAt: m.updatedAt.toISOString() }))}
      />
      <AiSettings
        saved={saved}
        defaults={{
          anthropicKey: Boolean(env.ANTHROPIC_API_KEY),
          openaiKey: Boolean(env.OPENAI_API_KEY),
          openaiBaseUrl: env.OPENAI_BASE_URL ?? null,
          routes: Object.fromEntries(AI_ROLES.map((r) => [r, formatModelRoute(routeForRole(env, r))])) as Record<(typeof AI_ROLES)[number], string>,
          voiceProvider: env.VOICE_PROVIDER,
        }}
        secretConfigured={Boolean(env.APP_SECRET)}
        configError={configError}
      />
    </main>
  );
}
