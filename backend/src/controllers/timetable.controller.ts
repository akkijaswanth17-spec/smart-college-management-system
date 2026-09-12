import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { assertNoTimetableConflict } from "../services/timetable.service";
import { recordAudit } from "../services/audit.service";
import { assertOwnBranch, scopedDepartmentId } from "../middleware/branchScope.middleware";

const include = {
  faculty: { include: { user: { select: { email: true } } } },
  subject: true,
  department: true,
  room: true,
  block: true,
};

export const listTimetable = asyncHandler(async (req: Request, res: Response) => {
  const { facultyId, day, year, section, academicYear } = req.query;
  const departmentId = scopedDepartmentId(req, req.query.departmentId ? String(req.query.departmentId) : undefined);

  const where = {
    isActive: true,
    ...(facultyId ? { facultyId: String(facultyId) } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(day ? { day: String(day) as any } : {}),
    ...(year ? { year: parseInt(String(year), 10) } : {}),
    ...(section ? { section: String(section) } : {}),
    ...(academicYear ? { academicYear: String(academicYear) } : {}),
  };

  const entries = await prisma.timetableEntry.findMany({
    where,
    include,
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });

  res.json({ success: true, data: entries });
});

export const myTimetable = asyncHandler(async (req: Request, res: Response) => {
  const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.userId } });
  if (!faculty) throw ApiError.notFound("Faculty profile not found");

  const entries = await prisma.timetableEntry.findMany({
    where: { facultyId: faculty.id, isActive: true },
    include,
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });

  res.json({ success: true, data: entries });
});

export const createTimetableEntry = asyncHandler(async (req: Request, res: Response) => {
  const { allowRoomConflict, ...rest } = req.body;
  const data = { ...rest, departmentId: scopedDepartmentId(req, rest.departmentId)! };

  if (req.user!.role === "BRANCH") {
    const assignedFaculty = await prisma.faculty.findUnique({ where: { id: data.facultyId } });
    if (!assignedFaculty || assignedFaculty.departmentId !== data.departmentId) {
      throw ApiError.forbidden("You can only assign faculty from your own department");
    }
  }

  await assertNoTimetableConflict({ ...data, allowRoomConflict });

  const entry = await prisma.timetableEntry.create({ data, include });

  await recordAudit({
    userId: req.user!.userId,
    action: "TIMETABLE_CREATED",
    targetType: "TimetableEntry",
    targetId: entry.id,
  });

  res.status(201).json({ success: true, data: entry });
});

export const updateTimetableEntry = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.timetableEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Timetable entry not found");
  assertOwnBranch(req, existing.departmentId);

  const { allowRoomConflict, departmentId, ...data } = req.body;
  // A branch admin can edit everything else but can never move an entry out of their own department.
  if (req.user!.role !== "BRANCH" && departmentId) (data as Record<string, unknown>).departmentId = departmentId;

  if (req.user!.role === "BRANCH" && data.facultyId) {
    const assignedFaculty = await prisma.faculty.findUnique({ where: { id: data.facultyId } });
    if (!assignedFaculty || assignedFaculty.departmentId !== existing.departmentId) {
      throw ApiError.forbidden("You can only assign faculty from your own department");
    }
  }

  await assertNoTimetableConflict({
    facultyId: data.facultyId ?? existing.facultyId,
    roomId: data.roomId ?? existing.roomId,
    day: data.day ?? existing.day,
    startTime: data.startTime ?? existing.startTime,
    endTime: data.endTime ?? existing.endTime,
    academicYear: data.academicYear ?? existing.academicYear,
    excludeId: existing.id,
    allowRoomConflict,
  });

  const entry = await prisma.timetableEntry.update({ where: { id: req.params.id }, data, include });

  await recordAudit({
    userId: req.user!.userId,
    action: "TIMETABLE_UPDATED",
    targetType: "TimetableEntry",
    targetId: entry.id,
  });

  res.json({ success: true, data: entry });
});

export const deleteTimetableEntry = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.timetableEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Timetable entry not found");
  assertOwnBranch(req, existing.departmentId);

  await prisma.timetableEntry.delete({ where: { id: req.params.id } });

  await recordAudit({
    userId: req.user!.userId,
    action: "TIMETABLE_DELETED",
    targetType: "TimetableEntry",
    targetId: req.params.id,
  });

  res.json({ success: true, message: "Timetable entry deleted" });
});
