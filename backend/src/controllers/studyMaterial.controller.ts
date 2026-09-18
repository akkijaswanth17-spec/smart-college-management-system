import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { recordAudit } from "../services/audit.service";
import { assertOwnBranch, scopedDepartmentId } from "../middleware/branchScope.middleware";
import { env } from "../config/env";

// A Student always sees only their own department's materials; every other
// role uses the normal Branch-scoping helpers (Admin may pass ?departmentId
// to look at one department, or omit it to see everything).
async function resolveListDepartmentId(req: Request): Promise<string | undefined> {
  if (req.user!.role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
    if (!student) throw ApiError.notFound("Student profile not found");
    return student.departmentId;
  }
  return scopedDepartmentId(req, req.query.departmentId ? String(req.query.departmentId) : undefined);
}

export const listStudyMaterials = asyncHandler(async (req: Request, res: Response) => {
  const { type, search } = req.query as Record<string, string | undefined>;
  const departmentId = await resolveListDepartmentId(req);

  const materials = await prisma.studyMaterial.findMany({
    where: {
      ...(departmentId ? { departmentId } : {}),
      ...(type ? { type: type as any } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      department: { select: { id: true, name: true, code: true } },
      uploadedBy: { select: { id: true, email: true } },
    },
  });

  res.json({ success: true, data: materials });
});

export const createStudyMaterial = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("A file is required");
  const departmentId = scopedDepartmentId(req, req.body.departmentId);
  if (!departmentId) throw ApiError.badRequest("departmentId is required");

  const material = await prisma.studyMaterial.create({
    data: {
      title: req.body.title,
      type: req.body.type,
      departmentId,
      fileUrl: `/uploads/materials/${req.file.filename}`,
      fileName: req.file.originalname,
      uploadedById: req.user!.userId,
    },
    include: { department: { select: { id: true, name: true, code: true } } },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "STUDY_MATERIAL_UPLOADED",
    targetType: "StudyMaterial",
    targetId: material.id,
    metadata: { title: material.title, type: material.type },
  });

  res.status(201).json({ success: true, data: material });
});

export const deleteStudyMaterial = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.studyMaterial.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Study material not found");
  assertOwnBranch(req, existing.departmentId);

  await prisma.studyMaterial.delete({ where: { id: req.params.id } });

  const filePath = path.join(env.uploadDir, "materials", path.basename(existing.fileUrl));
  fs.unlink(filePath, () => {
    // Best-effort cleanup — a missing file on disk should never fail the request.
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "STUDY_MATERIAL_DELETED",
    targetType: "StudyMaterial",
    targetId: req.params.id,
    metadata: { title: existing.title },
  });

  res.json({ success: true, message: "Study material deleted" });
});
