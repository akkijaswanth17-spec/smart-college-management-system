import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { getPagination, buildMeta } from "../utils/pagination";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = getPagination(req, 30);

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.userId },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where: { userId: req.user!.userId } }),
    prisma.notification.count({ where: { userId: req.user!.userId, status: "UNREAD" } }),
  ]);

  res.json({ success: true, data: notifications, meta: { ...buildMeta(total, page, pageSize), unreadCount } });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification) throw ApiError.notFound("Notification not found");
  if (notification.userId !== req.user!.userId) throw ApiError.forbidden();

  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { status: "READ" },
  });

  res.json({ success: true, data: updated });
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, status: "UNREAD" },
    data: { status: "READ" },
  });
  res.json({ success: true, message: "All notifications marked as read" });
});
