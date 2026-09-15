import { countDueVocab } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { redirect, unstable_rethrow } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DatabaseNotice } from "@/components/setup-notice";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user;
  let dueCount = 0;
  try {
    user = await getCurrentUser();
    dueCount = await countDueVocab(user.id);
  } catch (err) {
    unstable_rethrow(err); // let the sign-in redirect through
    return <DatabaseNotice message={(err as Error).message.split("\n")[0] ?? "Unknown error"} />;
  }
  if (!user.placementCompleted) redirect("/onboarding");
  return <AppShell dueCount={dueCount}>{children}</AppShell>;
}
