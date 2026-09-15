import Stripe from "stripe";
import { HttpError } from "./api";

/** Billing works once a Stripe secret key and the Pro price id are set. */
export function billingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO);
}

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new HttpError(400, "Billing isn't configured (set STRIPE_SECRET_KEY).", "billing_disabled");
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

export function appOrigin(req: Request): string {
  return process.env.BETTER_AUTH_URL ?? new URL(req.url).origin;
}
