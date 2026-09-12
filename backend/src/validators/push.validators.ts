import { z } from "zod";

export const subscribePushSchema = z.object({
  body: z.object({
    endpoint: z.string().trim().url(),
    keys: z.object({
      p256dh: z.string().trim().min(1),
      auth: z.string().trim().min(1),
    }),
  }),
});

export const unsubscribePushSchema = z.object({
  body: z.object({
    endpoint: z.string().trim().url(),
  }),
});
