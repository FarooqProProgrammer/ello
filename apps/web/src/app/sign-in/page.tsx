import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { authEnabled, getAuth, googleEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (!authEnabled()) redirect("/");
  if (await getAuth().api.getSession({ headers: await headers() })) redirect("/");
  return <AuthForm mode="sign-in" google={googleEnabled()} />;
}
