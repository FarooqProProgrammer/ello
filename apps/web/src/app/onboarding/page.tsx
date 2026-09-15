import { publicPlacementQuestions } from "@repo/activities";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { unstable_rethrow } from "next/navigation";
import { DatabaseNotice } from "@/components/setup-notice";
import { Onboarding } from "./onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (err) {
    unstable_rethrow(err); // let the sign-in redirect through
    return <DatabaseNotice message={(err as Error).message.split("\n")[0] ?? "Unknown error"} />;
  }
  return <Onboarding questions={publicPlacementQuestions()} retake={user.placementCompleted} />;
}
