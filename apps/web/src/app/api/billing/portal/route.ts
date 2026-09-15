import { NextResponse } from "next/server";
import { errorResponse, HttpError } from "@/lib/api";
import { appOrigin, getStripe } from "@/lib/billing";
import { getCurrentUser } from "@/lib/current-user";

/** Opens the Stripe customer portal (change card, cancel, invoices). */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user.stripeCustomerId) throw new HttpError(400, "No subscription found for this account.");
    const portal = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appOrigin(req)}/billing`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    return errorResponse(err);
  }
}
