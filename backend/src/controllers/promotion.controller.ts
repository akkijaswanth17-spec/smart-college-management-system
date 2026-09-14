import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { scopedDepartmentId, assertOwnBranch } from "../middleware/branchScope.middleware";
import { recordAudit } from "../services/audit.service";

// Loads every student in a class so an admin can decide, per student, whether
// to carry them forward to the next year/semester, hold them back (detain),
// or grant a condonation — same department/year/section shape as the marks sheet.
export const getPromotionSheet = asyncHandler(async (req: Request, res: Response) => {
  const { year, section } = req.query as unknown as { year: number; section: string };
  const departmentId = scopedDepartmentId(req, req.query.departmentId as string | undefined)!;

  const students = await prisma.student.findMany({
    where: { departmentId, year: Number(year), section },
    orderBy: { studentId: "asc" },
    select: { id: true, studentId: true, fullName: true, year: true, semester: true },
  });

  res.json({ success: true, data: students });
});

export const promoteStudents = asyncHandler(async (req: Request, res: Response) => {
  const { toYear, toSemester, academicYear, promote, detain, condone } = req.body as {
    toYear: number;
    toSemester: number | null;
    academicYear: string;
    promote: string[];
    detain: string[];
    condone: string[];
  };

  if (promote.length === 0) throw ApiError.badRequest("No students to promote");

  const targets = await prisma.student.findMany({
    where: { id: { in: promote } },
    select: { id: true, departmentId: true },
  });
  targets.forEach((s) => assertOwnBranch(req, s.departmentId));
  if (targets.length !== promote.length) throw ApiError.badRequest("Some selected students could not be found");

  await prisma.student.updateMany({
    where: { id: { in: promote } },
    data: { year: toYear, semester: toSemester },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "STUDENTS_PROMOTED",
    targetType: "Student",
    metadata: {
      toYear,
      toSemester,
      academicYear,
      promotedIds: promote,
      detainedIds: detain,
      condonedIds: condone,
    },
  });

  res.json({ success: true, data: { promoted: promote.length, detained: detain.length } });
});
