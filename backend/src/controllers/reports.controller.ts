import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { assertOwnBranch } from "../middleware/branchScope.middleware";
import { recordAudit } from "../services/audit.service";

// Only ADMIN and BRANCH ever reach these handlers (enforced in reports.routes.ts).
// For BRANCH, assertOwnBranch below is what stops them reading another department's
// records by guessing an ID — never trust the route alone for that isolation.

export const getStudentDetailsReport = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;

  const student = await prisma.student.findUnique({
    where: { studentId },
    include: { department: true, user: { select: { email: true, isActive: true } } },
  });
  if (!student) throw ApiError.notFound("Student not found. Please check the Student ID.");
  assertOwnBranch(req, student.departmentId);

  await recordAudit({
    userId: req.user!.userId,
    action: "REPORT_STUDENT_DETAILS_GENERATED",
    targetType: "Student",
    targetId: student.id,
    metadata: { studentId: student.studentId },
  });

  res.json({
    success: true,
    data: {
      studentId: student.studentId,
      fullName: student.fullName,
      department: student.department.name,
      departmentCode: student.department.code,
      year: student.year,
      semester: student.semester,
      section: student.section,
      email: student.user.email,
      phone: student.phone,
      accountActive: student.user.isActive,
    },
  });
});

export const getStudentMarksReport = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;

  const student = await prisma.student.findUnique({
    where: { studentId },
    include: { department: true },
  });
  if (!student) throw ApiError.notFound("Student not found. Please check the Roll Number.");
  assertOwnBranch(req, student.departmentId);

  const marks = await prisma.mark.findMany({
    where: { studentId: student.id },
    include: { subject: { select: { name: true, code: true } } },
    orderBy: { subject: { name: "asc" } },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "REPORT_STUDENT_MARKS_GENERATED",
    targetType: "Student",
    targetId: student.id,
    metadata: { studentId: student.studentId },
  });

  res.json({
    success: true,
    data: {
      studentId: student.studentId,
      fullName: student.fullName,
      department: student.department.name,
      departmentCode: student.department.code,
      year: student.year,
      semester: student.semester,
      section: student.section,
      subjects: marks.map((m) => ({
        subject: m.subject.name,
        code: m.subject.code,
        mid1: m.mid1,
        mid2: m.mid2,
        semester: m.semester,
        academicYear: m.academicYear,
      })),
    },
  });
});

export const getFacultyDetailsReport = asyncHandler(async (req: Request, res: Response) => {
  const { facultyId } = req.params;

  const faculty = await prisma.faculty.findUnique({
    where: { facultyId },
    include: { department: true, user: { select: { email: true, isActive: true } } },
  });
  if (!faculty) throw ApiError.notFound("Faculty record not found. Please check the Faculty ID.");
  assertOwnBranch(req, faculty.departmentId);

  const timetable = await prisma.timetableEntry.findMany({
    where: { facultyId: faculty.id, isActive: true },
    include: { subject: true, room: true, block: true },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });

  const assignedSubjects = [...new Set(timetable.map((t) => t.subject.name))];
  const assignedSections = [...new Set(timetable.map((t) => `Year ${t.year} - ${t.section}`))];
  const assignedRooms = [...new Set(timetable.map((t) => t.room.number))];
  const assignedBlocks = [...new Set(timetable.map((t) => t.block.name))];

  await recordAudit({
    userId: req.user!.userId,
    action: "REPORT_FACULTY_DETAILS_GENERATED",
    targetType: "Faculty",
    targetId: faculty.id,
    metadata: { facultyId: faculty.facultyId },
  });

  res.json({
    success: true,
    data: {
      facultyId: faculty.facultyId,
      fullName: faculty.fullName,
      title: faculty.title,
      department: faculty.department.name,
      departmentCode: faculty.department.code,
      designation: faculty.designation,
      email: faculty.user.email,
      phone: faculty.phone,
      status: faculty.status,
      // No separate "date joined the college" field is tracked — this is when the
      // account was created in the system, the closest real, non-fabricated proxy.
      addedToSystemAt: faculty.createdAt,
      assignedSubjects,
      assignedSections,
      assignedRooms,
      assignedBlocks,
      timetable: timetable.map((t) => ({
        day: t.day,
        startTime: t.startTime,
        endTime: t.endTime,
        subject: t.subject.name,
        room: t.room.number,
        block: t.block.name,
        section: t.section,
        year: t.year,
      })),
    },
  });
});
