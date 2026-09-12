import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { getPagination, buildMeta } from "../utils/pagination";
import { recordAudit } from "../services/audit.service";

function attachmentUrl(filename?: string) {
  return filename ? `/uploads/academic/${filename}` : undefined;
}

export const listAcademicUpdates = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = getPagination(req);
  const { search, departmentId, year, section, category } = req.query;

  const where = {
    ...(departmentId ? { departmentId: String(departmentId) } : {}),
    ...(year ? { year: parseInt(String(year), 10) } : {}),
    ...(section ? { section: String(section) } : {}),
    ...(category ? { category: String(category) as any } : {}),
    ...(search ? { title: { contains: String(search), mode: "insensitive" as const } } : {}),
  };

  const [updates, total] = await Promise.all([
    prisma.academicUpdate.findMany({
      where,
      skip,
      take,
      orderBy: { date: "desc" },
      include: { department: true, createdBy: { select: { id: true, email: true } } },
    }),
    prisma.academicUpdate.count({ where }),
  ]);

  res.json({ success: true, data: updates, meta: buildMeta(total, page, pageSize) });
});

export const getAcademicUpdate = asyncHandler(async (req: Request, res: Response) => {
  const update = await prisma.academicUpdate.findUnique({ where: { id: req.params.id }, include: { department: true } });
  if (!update) throw ApiError.notFound("Academic update not found");
  res.json({ success: true, data: update });
});

export const createAcademicUpdate = asyncHandler(async (req: Request, res: Response) => {
  const update = await prisma.academicUpdate.create({
    data: {
      ...req.body,
      attachmentUrl: attachmentUrl(req.file?.filename),
      createdById: req.user!.userId,
    },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "ACADEMIC_UPDATE_CREATED",
    targetType: "AcademicUpdate",
    targetId: update.id,
  });

  res.status(201).json({ success: true, data: update });
});

export const updateAcademicUpdate = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.academicUpdate.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Academic update not found");

  const update = await prisma.academicUpdate.update({
    where: { id: req.params.id },
    data: {
      ...req.body,
      ...(req.file ? { attachmentUrl: attachmentUrl(req.file.filename) } : {}),
    },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "ACADEMIC_UPDATE_UPDATED",
    targetType: "AcademicUpdate",
    targetId: update.id,
  });

  res.json({ success: true, data: update });
});

export const deleteAcademicUpdate = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.academicUpdate.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Academic update not found");

  await prisma.academicUpdate.delete({ where: { id: req.params.id } });

  await recordAudit({
    userId: req.user!.userId,
    action: "ACADEMIC_UPDATE_DELETED",
    targetType: "AcademicUpdate",
    targetId: req.params.id,
  });

  res.json({ success: true, message: "Academic update deleted" });
});
