import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { getPagination, buildMeta } from "../utils/pagination";
import { recordAudit } from "../services/audit.service";

function imageUrl(filename?: string) {
  return filename ? `/uploads/lostfound/${filename}` : undefined;
}

export const listLostFound = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = getPagination(req);
  const { search, type, status } = req.query;

  const where = {
    ...(type ? { type: String(type) as any } : {}),
    ...(status ? { status: String(status) as any } : {}),
    ...(search
      ? {
          OR: [
            { itemName: { contains: String(search), mode: "insensitive" as const } },
            { description: { contains: String(search), mode: "insensitive" as const } },
            { location: { contains: String(search), mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.lostFoundItem.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, email: true } } },
    }),
    prisma.lostFoundItem.count({ where }),
  ]);

  res.json({ success: true, data: items, meta: buildMeta(total, page, pageSize) });
});

export const getLostFound = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.lostFoundItem.findUnique({ where: { id: req.params.id } });
  if (!item) throw ApiError.notFound("Item not found");
  res.json({ success: true, data: item });
});

export const createLostFound = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.lostFoundItem.create({
    data: {
      ...req.body,
      status: req.body.type,
      imageUrl: imageUrl(req.file?.filename),
      createdById: req.user!.userId,
    },
  });
  res.status(201).json({ success: true, data: item });
});

export const updateLostFound = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.lostFoundItem.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Item not found");

  // Owners may edit their own post; only admin may change status (moderation).
  const isOwner = existing.createdById === req.user!.userId;
  const isAdmin = req.user!.role === "ADMIN";
  if (!isOwner && !isAdmin) throw ApiError.forbidden();

  const { status, ...rest } = req.body;
  const data: Record<string, unknown> = isAdmin ? { ...rest, status } : rest;
  if (isAdmin && status) data.moderatedById = req.user!.userId;

  const item = await prisma.lostFoundItem.update({ where: { id: req.params.id }, data });

  if (isAdmin && status) {
    await recordAudit({
      userId: req.user!.userId,
      action: "LOST_FOUND_MODERATED",
      targetType: "LostFoundItem",
      targetId: item.id,
      metadata: { status },
    });
  }

  res.json({ success: true, data: item });
});

export const deleteLostFound = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.lostFoundItem.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Item not found");

  const isOwner = existing.createdById === req.user!.userId;
  const isAdmin = req.user!.role === "ADMIN";
  if (!isOwner && !isAdmin) throw ApiError.forbidden();

  await prisma.lostFoundItem.delete({ where: { id: req.params.id } });

  if (isAdmin) {
    await recordAudit({
      userId: req.user!.userId,
      action: "LOST_FOUND_DELETED",
      targetType: "LostFoundItem",
      targetId: req.params.id,
    });
  }

  res.json({ success: true, message: "Item deleted" });
});
