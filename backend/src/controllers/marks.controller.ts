import { Request, Response } from "express";
import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { prisma } from "../config/prisma";
import { parseSpreadsheet, importMarks } from "../services/marks.service";
import { recordAudit } from "../services/audit.service";
import { assertOwnBranch, scopedDepartmentId } from "../middleware/branchScope.middleware";

export const importMarksFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("An Excel or CSV file is required");

  const buffer = fs.readFileSync(req.file.path);
  const rows = parseSpreadsheet(buffer);

  if (rows.length === 0) throw ApiError.badRequest("The uploaded file has no data rows");
  if (rows.length > 5000) throw ApiError.badRequest("Maximum 5000 rows per import");

  const summary = await importMarks(rows, req.user!.userId);

  const batch = await prisma.importBatch.create({
    data: {
      type: "MARKS",
      fileName: req.file.originalname,
      status: summary.failedRows === 0 ? "COMPLETED" : summary.successRows > 0 ? "COMPLETED_WITH_ERRORS" : "FAILED",
      totalRows: summary.totalRows,
      successRows: summary.successRows,
      failedRows: summary.failedRows,
      errors: summary.errors.length ? JSON.parse(JSON.stringify(summary.errors)) : undefined,
      importedById: req.user!.userId,
    },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "MARKS_IMPORTED",
    targetType: "ImportBatch",
    targetId: batch.id,
    metadata: { successRows: summary.successRows, failedRows: summary.failedRows },
  });

  res.status(201).json({ success: true, data: { batchId: batch.id, ...summary } });
});

export const listMarks = asyncHandler(async (req: Request, res: Response) => {
  const { search, subjectId, year, section } = req.query as Record<string, string | undefined>;
  const departmentId = scopedDepartmentId(req, req.query.departmentId as string | undefined);

  const marks = await prisma.mark.findMany({
    where: {
      subjectId: subjectId || undefined,
      student: {
        departmentId: departmentId || undefined,
        year: year ? Number(year) : undefined,
        section: section || undefined,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { studentId: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    include: {
      student: { select: { studentId: true, fullName: true, year: true, section: true } },
      subject: { select: { name: true, code: true } },
    },
    orderBy: [{ student: { studentId: "asc" } }, { subject: { name: "asc" } }],
    take: 500,
  });

  res.json({ success: true, data: marks });
});

export const deleteMark = asyncHandler(async (req: Request, res: Response) => {
  const mark = await prisma.mark.findUnique({
    where: { id: req.params.id },
    include: { student: { select: { departmentId: true } } },
  });
  if (!mark) throw ApiError.notFound("Mark record not found");
  assertOwnBranch(req, mark.student.departmentId);

  await prisma.mark.delete({ where: { id: req.params.id } });

  await recordAudit({
    userId: req.user!.userId,
    action: "MARK_DELETED",
    targetType: "Mark",
    targetId: req.params.id,
  });

  res.json({ success: true });
});

const academicYearDefault = () => `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

type ExamType = "mid1" | "mid2" | "semester";

function scoreData(examType: ExamType, value: number | null) {
  if (examType === "mid1") return { mid1: value };
  if (examType === "mid2") return { mid2: value };
  return { semester: value };
}

// Blank "entry sheet" for a class and a single exam — every student in that
// department/year/section, one column per subject actually taught to that
// class (from its timetable, falling back to the whole department if the
// timetable isn't set up yet), pre-filled with whatever's already saved for
// the chosen exam so re-opening the sheet shows current values, not blanks.
export const getMarksSheet = asyncHandler(async (req: Request, res: Response) => {
  const { year, section, examType, academicYear } = req.query as unknown as {
    year: number;
    section: string;
    examType: ExamType;
    academicYear?: string;
  };
  const departmentId = scopedDepartmentId(req, req.query.departmentId as string | undefined)!;
  const ay = academicYear || academicYearDefault();

  const [students, timetableSubjects] = await Promise.all([
    prisma.student.findMany({
      where: { departmentId, year: Number(year), section },
      orderBy: { studentId: "asc" },
      select: { id: true, studentId: true, fullName: true },
    }),
    prisma.timetableEntry.findMany({
      where: { departmentId, year: Number(year), section, isActive: true },
      distinct: ["subjectId"],
      select: { subject: { select: { id: true, name: true, code: true } } },
    }),
  ]);

  let subjects = timetableSubjects.map((t) => t.subject).sort((a, b) => a.name.localeCompare(b.name));

  // This class may not have its timetable filled in yet (no rooms/faculty
  // assigned) — marks entry doesn't depend on that, so fall back to every
  // subject in the department rather than blocking on the timetable.
  if (subjects.length === 0) {
    subjects = await prisma.subject.findMany({
      where: { departmentId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    });
  }

  const existingMarks = await prisma.mark.findMany({
    where: {
      academicYear: ay,
      studentId: { in: students.map((s) => s.id) },
      subjectId: { in: subjects.map((s) => s.id) },
    },
  });
  const marksByKey = new Map(existingMarks.map((m) => [`${m.studentId}:${m.subjectId}`, m]));

  const rows = students.map((s) => ({
    studentId: s.id,
    rollNumber: s.studentId,
    fullName: s.fullName,
    scores: Object.fromEntries(
      subjects.map((subj) => [subj.id, marksByKey.get(`${s.id}:${subj.id}`)?.[examType] ?? null])
    ),
  }));

  res.json({ success: true, data: { academicYear: ay, subjects, students: rows } });
});

export const saveMarksSheet = asyncHandler(async (req: Request, res: Response) => {
  const { examType, academicYear, entries } = req.body as {
    examType: ExamType;
    academicYear: string;
    entries: { studentId: string; subjectId: string; value: number | null }[];
  };

  if (req.user!.role === "BRANCH") {
    const studentIds = [...new Set(entries.map((e) => e.studentId))];
    const count = await prisma.student.count({
      where: { id: { in: studentIds }, departmentId: req.branchDepartmentId },
    });
    if (count !== studentIds.length) {
      throw ApiError.forbidden("You can only enter marks for students in your own department");
    }
  }

  await prisma.$transaction(
    entries.map((e) =>
      prisma.mark.upsert({
        where: {
          studentId_subjectId_academicYear: { studentId: e.studentId, subjectId: e.subjectId, academicYear },
        },
        create: {
          studentId: e.studentId,
          subjectId: e.subjectId,
          academicYear,
          importedById: req.user!.userId,
          ...scoreData(examType, e.value),
        },
        update: {
          importedById: req.user!.userId,
          ...scoreData(examType, e.value),
        },
      })
    )
  );

  await recordAudit({
    userId: req.user!.userId,
    action: "MARKS_ENTERED",
    targetType: "Mark",
    metadata: { examType, academicYear, count: entries.length },
  });

  res.json({ success: true, data: { saved: entries.length } });
});

export const getMyMarks = asyncHandler(async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
  if (!student) throw ApiError.notFound("Student profile not found");

  const marks = await prisma.mark.findMany({
    where: { studentId: student.id },
    include: { subject: { select: { name: true, code: true } } },
    orderBy: { subject: { name: "asc" } },
  });

  res.json({ success: true, data: marks });
});
