import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { getPagination, buildMeta } from "../utils/pagination";
import { recordAudit } from "../services/audit.service";

function attachmentUrl(filename?: string) {
  return filename ? `/uploads/notices/${filename}` : undefined;
}

export const listNotices = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = getPagination(req);
  const { search, category, priority } = req.query;
  const isPrivileged = req.user!.role === "ADMIN";

  const where = {
    ...(isPrivileged ? {} : { isPublished: true, OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }] }),
    ...(category ? { category: String(category) as any } : {}),
    ...(priority ? { priority: String(priority) as any } : {}),
    ...(search
      ? { title: { contains: String(search), mode: "insensitive" as const } }
      : {}),
  };

  const [notices, total] = await Promise.all([
    prisma.notice.findMany({
      where,
      skip,
      take,
      orderBy: [{ priority: "desc" }, { publishedDate: "desc" }, { createdAt: "desc" }],
      include: { createdBy: { select: { id: true, email: true } } },
    }),
    prisma.notice.count({ where }),
  ]);

  res.json({ success: true, data: notices, meta: buildMeta(total, page, pageSize) });
});

export const getNotice = asyncHandler(async (req: Request, res: Response) => {
  const notice = await prisma.notice.findUnique({ where: { id: req.params.id } });
  if (!notice) throw ApiError.notFound("Notice not found");
  if (req.user!.role !== "ADMIN" && !notice.isPublished) throw ApiError.forbidden();
  res.json({ success: true, data: notice });
});

export const createNotice = asyncHandler(async (req: Request, res: Response) => {
  const notice = await prisma.notice.create({
    data: {
      ...req.body,
      attachmentUrl: attachmentUrl(req.file?.filename),
      createdById: req.user!.userId,
    },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "NOTICE_CREATED",
    targetType: "Notice",
    targetId: notice.id,
    metadata: { title: notice.title },
  });

  res.status(201).json({ success: true, data: notice });
});

export const updateNotice = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.notice.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Notice not found");

  const notice = await prisma.notice.update({
    where: { id: req.params.id },
    data: {
      ...req.body,
      ...(req.file ? { attachmentUrl: attachmentUrl(req.file.filename) } : {}),
    },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "NOTICE_UPDATED",
    targetType: "Notice",
    targetId: notice.id,
  });

  res.json({ success: true, data: notice });
});

export const deleteNotice = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.notice.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Notice not found");

  await prisma.notice.delete({ where: { id: req.params.id } });

  await recordAudit({
    userId: req.user!.userId,
    action: "NOTICE_DELETED",
    targetType: "Notice",
    targetId: req.params.id,
    metadata: { title: existing.title },
  });

  res.json({ success: true, message: "Notice deleted" });
});
