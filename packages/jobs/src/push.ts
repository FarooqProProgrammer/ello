import { deletePushSubscription, listPushSubscriptions } from "@repo/db";
import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

let configuredFor: string | null = null;

/** True when VAPID keys are set (run `pnpm vapid` to generate them). */
export function pushConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (configuredFor !== publicKey) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:reminders@example.com", publicKey, privateKey);
    configuredFor = publicKey;
  }
  return true;
}

/** Sends a notification to every device the learner subscribed; removes expired subscriptions. Returns how many were delivered. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0;
  const subscriptions = await listPushSubscriptions(userId);
  let delivered = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 60 * 60 });
      delivered++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await deletePushSubscription(sub.endpoint);
      else console.warn(`[push] delivery failed (${status ?? "network"}):`, (err as Error).message);
    }
  }
  return delivered;
}
