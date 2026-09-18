import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { getPagination, buildMeta } from "../utils/pagination";
import { recordAudit } from "../services/audit.service";
import { assertOwnBranch, scopedDepartmentId } from "../middleware/branchScope.middleware";

function attachmentUrl(filename?: string) {
  return filename ? `/uploads/notices/${filename}` : undefined;
}

export const listNotices = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = getPagination(req);
  const { search, category, priority } = req.query;
  const role = req.user!.role;
  const isPrivileged = role === "ADMIN" || role === "BRANCH";

  let audienceFilter: Record<string, unknown> = {};
  if (role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
    audienceFilter = {
      isPublished: true,
      OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
      AND: [{ OR: [{ departmentId: null }, { departmentId: student?.departmentId }] }],
    };
  } else if (role === "FACULTY") {
    audienceFilter = { isPublished: true, OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }] };
  } else if (role === "BRANCH") {
    // A Branch account manages only the notices it created for its own
    // department — never the college-wide ones Admin publishes.
    audienceFilter = { departmentId: req.branchDepartmentId };
  } else {
    const departmentId = req.query.departmentId ? String(req.query.departmentId) : undefined;
    if (departmentId) audienceFilter = { departmentId };
  }

  const where = {
    ...audienceFilter,
    ...(category ? { category: String(category) as any } : {}),
    ...(priority ? { priority: String(priority) as any } : {}),
    ...(search ? { title: { contains: String(search), mode: "insensitive" as const } } : {}),
  };

  const [notices, total] = await Promise.all([
    prisma.notice.findMany({
      where,
      skip,
      take,
      orderBy: [{ priority: "desc" }, { publishedDate: "desc" }, { createdAt: "desc" }],
      include: { createdBy: { select: { id: true, email: true } }, department: { select: { id: true, name: true, code: true } } },
    }),
    prisma.notice.count({ where }),
  ]);

  res.json({ success: true, data: notices, meta: buildMeta(total, page, pageSize) });
});

export const getNotice = asyncHandler(async (req: Request, res: Response) => {
  const notice = await prisma.notice.findUnique({ where: { id: req.params.id } });
  if (!notice) throw ApiError.notFound("Notice not found");

  const role = req.user!.role;
  if (role === "BRANCH") {
    assertOwnBranch(req, notice.departmentId ?? "");
  } else if (role !== "ADMIN" && !notice.isPublished) {
    throw ApiError.forbidden();
  }

  res.json({ success: true, data: notice });
});

export const createNotice = asyncHandler(async (req: Request, res: Response) => {
  const departmentId = scopedDepartmentId(req, req.body.departmentId);

  const notice = await prisma.notice.create({
    data: {
      ...req.body,
      departmentId: departmentId || null,
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
  assertOwnBranch(req, existing.departmentId ?? "");

  const notice = await prisma.notice.update({
    where: { id: req.params.id },
    data: {
      ...req.body,
      // A Branch account can never move a notice out of its own department.
      ...(req.user!.role === "BRANCH" ? { departmentId: req.branchDepartmentId } : {}),
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
  assertOwnBranch(req, existing.departmentId ?? "");

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
