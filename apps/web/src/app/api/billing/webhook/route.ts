import { findUserByStripeCustomer, setPlan } from "@repo/db";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing";

const ACTIVE = new Set(["active", "trialing", "past_due"]);

function renewalDate(subscription: Stripe.Subscription): Date | null {
  // Newer API versions put the period on subscription items.
  const item = subscription.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const legacy = subscription as unknown as { current_period_end?: number };
  const seconds = item?.current_period_end ?? legacy.current_period_end;
  return seconds ? new Date(seconds * 1000) : null;
}

async function applySubscription(userId: string, subscription: Stripe.Subscription, deleted = false) {
  const active = !deleted && ACTIVE.has(subscription.status);
  await setPlan(userId, {
    plan: active ? "pro" : "free",
    stripeSubscriptionId: active ? subscription.id : null,
    planRenewsAt: active ? renewalDate(subscription) : null,
  });
}

const customerIdOf = (customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) =>
  typeof customer === "string" ? customer : (customer?.id ?? null);

/** Stripe → plan sync. Configure the endpoint and STRIPE_WEBHOOK_SECRET in the Stripe dashboard (or `stripe listen`). */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${(err as Error).message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (userId && subscriptionId) await applySubscription(userId, await stripe.subscriptions.retrieve(subscriptionId));
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = customerIdOf(subscription.customer);
        const user = customerId ? await findUserByStripeCustomer(customerId) : null;
        if (user) await applySubscription(user.id, subscription, event.type === "customer.subscription.deleted");
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[billing] webhook handling failed", err);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
