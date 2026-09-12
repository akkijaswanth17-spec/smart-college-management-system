import webpush from "web-push";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

if (env.webPushConfigured) {
  webpush.setVapidDetails(env.webPush.subject, env.webPush.publicKey, env.webPush.privateKey);
}

export interface PushPayload {
  title: string;
  body: string;
}

/**
 * Sends a real phone/browser notification to every device a user has
 * enabled notifications on. Free — no third-party account, no per-message
 * cost. A no-op (returns sent: 0) until VAPID_* is configured in .env, same
 * honesty rule as the email/WhatsApp services: never claim delivery that
 * didn't happen.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number }> {
  if (!env.webPushConfigured) {
    // eslint-disable-next-line no-console
    console.log(`[webpush] NOT SENT — VAPID keys not configured. Notification for user ${userId}: ${payload.title}`);
    return { sent: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      sent += 1;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // The browser/user revoked this subscription — clean it up rather than retrying forever.
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
      } else {
        // eslint-disable-next-line no-console
        console.error(`[webpush] Send failed for subscription ${sub.id}:`, err);
      }
    }
  }

  return { sent };
}
