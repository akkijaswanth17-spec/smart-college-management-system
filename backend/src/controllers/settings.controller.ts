import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { recordAudit } from "../services/audit.service";

const FEE_KEY = "fee_payment_url";
const RESULTS_KEY = "results_url";

async function getSetting(key: string) {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

async function upsertSetting(key: string, value: string, updatedById: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value, updatedById },
    create: { key, value, updatedById },
  });
}

export const getFeeLink = asyncHandler(async (_req: Request, res: Response) => {
  const value = await getSetting(FEE_KEY);
  res.json({ success: true, data: { key: FEE_KEY, value } });
});

export const updateFeeLink = asyncHandler(async (req: Request, res: Response) => {
  const setting = await upsertSetting(FEE_KEY, req.body.value, req.user!.userId);
  await recordAudit({ userId: req.user!.userId, action: "SETTING_UPDATED", targetType: "Setting", targetId: FEE_KEY });
  res.json({ success: true, data: setting });
});

export const getResultsLink = asyncHandler(async (_req: Request, res: Response) => {
  const value = await getSetting(RESULTS_KEY);
  res.json({ success: true, data: { key: RESULTS_KEY, value } });
});

export const updateResultsLink = asyncHandler(async (req: Request, res: Response) => {
  const setting = await upsertSetting(RESULTS_KEY, req.body.value, req.user!.userId);
  await recordAudit({ userId: req.user!.userId, action: "SETTING_UPDATED", targetType: "Setting", targetId: RESULTS_KEY });
  res.json({ success: true, data: setting });
});
