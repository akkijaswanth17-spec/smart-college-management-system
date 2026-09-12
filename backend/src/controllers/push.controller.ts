import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

export const getVapidPublicKey = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: { publicKey: env.webPush.publicKey, configured: env.webPushConfigured } });
});

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const { endpoint, keys } = req.body;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: req.user!.userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: req.user!.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  res.status(201).json({ success: true, message: "Notifications enabled on this device" });
});

export const unsubscribe = asyncHandler(async (req: Request, res: Response) => {
  const { endpoint } = req.body;
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user!.userId } });
  res.json({ success: true, message: "Notifications disabled on this device" });
});
