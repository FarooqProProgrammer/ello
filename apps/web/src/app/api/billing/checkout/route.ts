import { setStripeCustomer } from "@repo/db";
import { NextResponse } from "next/server";
import { errorResponse, HttpError } from "@/lib/api";
import { appOrigin, billingEnabled, getStripe } from "@/lib/billing";
import { getCurrentUser } from "@/lib/current-user";

/** Starts Stripe Checkout for the Pro subscription. */
export async function POST(req: Request) {
  try {
    if (!billingEnabled()) throw new HttpError(400, "Billing isn't configured.", "billing_disabled");
    const user = await getCurrentUser();
    if (user.plan === "pro") throw new HttpError(400, "You're already on Pro. Use “Manage subscription”.");
    const stripe = getStripe();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await setStripeCustomer(user.id, customerId);
    }

    const origin = appOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: process.env.STRIPE_PRICE_PRO!, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/billing?success=1`,
      cancel_url: `${origin}/billing?canceled=1`,
    });
    if (!session.url) throw new HttpError(502, "Stripe didn't return a checkout link.");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return errorResponse(err);
  }
}
