import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { recordAudit } from "../services/audit.service";
import { assertOwnBranch, scopedDepartmentId } from "../middleware/branchScope.middleware";
import {
  periodsForClassDay,
  myTodayPeriods,
  todayDateString,
  todayDayName,
  findCurrentPeriod,
  calcPercentage,
} from "../services/attendance.service";

const THRESHOLD_KEY = "attendance_low_threshold_percent";
const DEFAULT_THRESHOLD = 75;

// ============================================================
// FACULTY — today's own periods
// ============================================================

export const getMyTodayPeriods = asyncHandler(async (req: Request, res: Response) => {
  const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.userId } });
  if (!faculty) throw ApiError.notFound("Faculty profile not found");

  const periods = await myTodayPeriods(faculty.id);
  const now = todayDateString();
  const current = findCurrentPeriod(
    periods,
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
  );

  res.json({
    success: true,
    data: {
      date: now,
      day: todayDayName(),
      currentPeriodId: current?.id ?? null,
      periods: periods.map((p) => ({
        id: p.id,
        period: p.period,
        startTime: p.startTime,
        endTime: p.endTime,
        subject: p.subject,
        departmentId: p.departmentId,
        year: p.year,
        section: p.section,
        alreadyTaken: p.alreadyTaken,
      })),
    },
  });
});

// ============================================================
// BRANCH / ADMIN — today's periods for a selected class
// ============================================================

export const getClassTodayPeriods = asyncHandler(async (req: Request, res: Response) => {
  const departmentId = scopedDepartmentId(req, req.query.departmentId as string | undefined);
  const year = Number(req.query.year);
  const section = String(req.query.section);
  if (!departmentId) throw ApiError.badRequest("departmentId is required");

  const day = todayDayName();
  const periods = await periodsForClassDay(departmentId, year, section, day);

  const takenIds = await prisma.attendanceRecord.findMany({
    where: { timetableEntryId: { in: periods.map((p) => p.id) }, date: new Date(todayDateString()) },
    distinct: ["timetableEntryId"],
    select: { timetableEntryId: true },
  });
  const takenSet = new Set(takenIds.map((t) => t.timetableEntryId));

  res.json({
    success: true,
    data: {
      date: todayDateString(),
      day,
      periods: periods.map((p) => ({
        id: p.id,
        period: p.period,
        startTime: p.startTime,
        endTime: p.endTime,
        subject: p.subject,
        faculty: p.faculty,
        alreadyTaken: takenSet.has(p.id),
      })),
    },
  });
});

// ============================================================
// Roster for one period (Take / Update share this) — defaults every
// student to PRESENT unless a record already exists for that date.
// ============================================================

export const getRoster = asyncHandler(async (req: Request, res: Response) => {
  const { timetableEntryId } = req.params;
  const date = String(req.query.date);

  const entry = await prisma.timetableEntry.findUnique({
    where: { id: timetableEntryId },
    include: {
      faculty: { select: { id: true, fullName: true, title: true } },
      subject: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
    },
  });
  if (!entry) throw ApiError.notFound("Timetable period not found");

  if (req.user!.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.userId } });
    if (!faculty || faculty.id !== entry.facultyId) {
      throw ApiError.forbidden("You can only take attendance for your own classes");
    }
  }
  assertOwnBranch(req, entry.departmentId);

  const isToday = date === todayDateString();
  if (!isToday && req.user!.role !== "ADMIN") {
    throw ApiError.forbidden("Attendance can only be updated for the current day.");
  }

  const [students, existing] = await Promise.all([
    prisma.student.findMany({
      where: { departmentId: entry.departmentId, year: entry.year, section: entry.section },
      orderBy: { studentId: "asc" },
      select: { id: true, studentId: true, fullName: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { timetableEntryId, date: new Date(date) },
      select: { studentId: true, status: true },
    }),
  ]);
  const existingMap = new Map(existing.map((e) => [e.studentId, e.status]));

  res.json({
    success: true,
    data: {
      period: entry,
      date,
      alreadyTaken: existing.length > 0,
      students: students.map((s) => ({
        studentId: s.id,
        rollNumber: s.studentId,
        fullName: s.fullName,
        status: existingMap.get(s.id) ?? "PRESENT",
      })),
    },
  });
});

export const saveAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { timetableEntryId, date, records } = req.body as {
    timetableEntryId: string;
    date: string;
    records: { studentId: string; status: "PRESENT" | "ABSENT" }[];
  };

  const entry = await prisma.timetableEntry.findUnique({ where: { id: timetableEntryId } });
  if (!entry) throw ApiError.notFound("Timetable period not found");

  if (req.user!.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.userId } });
    if (!faculty || faculty.id !== entry.facultyId) {
      throw ApiError.forbidden("You can only take attendance for your own classes");
    }
  }
  assertOwnBranch(req, entry.departmentId);

  const isToday = date === todayDateString();
  if (!isToday && req.user!.role !== "ADMIN") {
    throw ApiError.forbidden("Attendance can only be updated for the current day.");
  }

  const validStudentIds = new Set(
    (
      await prisma.student.findMany({
        where: { departmentId: entry.departmentId, year: entry.year, section: entry.section },
        select: { id: true },
      })
    ).map((s) => s.id)
  );
  if (records.some((r) => !validStudentIds.has(r.studentId))) {
    throw ApiError.badRequest("One or more students do not belong to this class");
  }

  await prisma.$transaction(
    records.map((r) =>
      prisma.attendanceRecord.upsert({
        where: {
          timetableEntryId_studentId_date: { timetableEntryId, studentId: r.studentId, date: new Date(date) },
        },
        create: {
          timetableEntryId,
          studentId: r.studentId,
          facultyId: entry.facultyId,
          subjectId: entry.subjectId,
          departmentId: entry.departmentId,
          year: entry.year,
          section: entry.section,
          date: new Date(date),
          status: r.status,
          createdById: req.user!.userId,
        },
        update: { status: r.status },
      })
    )
  );

  await recordAudit({
    userId: req.user!.userId,
    action: "ATTENDANCE_SAVED",
    targetType: "TimetableEntry",
    targetId: timetableEntryId,
    metadata: { date, count: records.length },
  });

  const present = records.filter((r) => r.status === "PRESENT").length;
  res.json({ success: true, data: { saved: records.length, present, absent: records.length - present } });
});

// ============================================================
// Reports (Faculty / Branch / Admin)
// ============================================================

export const getClassReport = asyncHandler(async (req: Request, res: Response) => {
  const departmentId = scopedDepartmentId(req, req.query.departmentId as string | undefined);
  const year = Number(req.query.year);
  const section = String(req.query.section);
  const { subjectId, facultyId, dateFrom, dateTo } = req.query as Record<string, string | undefined>;
  if (!departmentId) throw ApiError.badRequest("departmentId is required");

  let effectiveFacultyId = facultyId;
  if (req.user!.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.userId } });
    if (!faculty) throw ApiError.notFound("Faculty profile not found");
    effectiveFacultyId = faculty.id;
  }

  const [students, records] = await Promise.all([
    prisma.student.findMany({
      where: { departmentId, year, section },
      orderBy: { studentId: "asc" },
      select: { id: true, studentId: true, fullName: true },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        departmentId,
        year,
        section,
        subjectId: subjectId || undefined,
        facultyId: effectiveFacultyId || undefined,
        date: { gte: new Date(dateFrom!), lte: new Date(dateTo!) },
      },
      select: { studentId: true, status: true, subjectId: true, subject: { select: { name: true, code: true } } },
    }),
  ]);

  const bySubject = new Map<string, { name: string; code: string }>();
  const byStudent = new Map<string, { present: number; total: number; subjects: Map<string, { present: number; total: number }> }>();
  for (const s of students) byStudent.set(s.id, { present: 0, total: 0, subjects: new Map() });

  for (const r of records) {
    const bucket = byStudent.get(r.studentId);
    if (!bucket) continue;
    bucket.total++;
    if (r.status === "PRESENT") bucket.present++;
    bySubject.set(r.subjectId, r.subject);
    if (!bucket.subjects.has(r.subjectId)) bucket.subjects.set(r.subjectId, { present: 0, total: 0 });
    const sub = bucket.subjects.get(r.subjectId)!;
    sub.total++;
    if (r.status === "PRESENT") sub.present++;
  }

  const rows = students.map((s) => {
    const bucket = byStudent.get(s.id)!;
    return {
      studentId: s.studentId,
      fullName: s.fullName,
      present: bucket.present,
      absent: bucket.total - bucket.present,
      total: bucket.total,
      percentage: calcPercentage(bucket.present, bucket.total),
      subjects: Array.from(bucket.subjects.entries()).map(([subjId, v]) => ({
        subjectId: subjId,
        subjectName: bySubject.get(subjId)?.name,
        subjectCode: bySubject.get(subjId)?.code,
        present: v.present,
        absent: v.total - v.present,
        total: v.total,
        percentage: calcPercentage(v.present, v.total),
      })),
    };
  });

  res.json({ success: true, data: rows });
});

// ============================================================
// STUDENT — own attendance
// ============================================================

export const getMyAttendance = asyncHandler(async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
  if (!student) throw ApiError.notFound("Student profile not found");

  const records = await prisma.attendanceRecord.findMany({
    where: { studentId: student.id },
    select: { status: true, subjectId: true, subject: { select: { name: true, code: true } } },
  });

  const bySubject = new Map<string, { name: string; code: string; present: number; total: number }>();
  let present = 0;
  for (const r of records) {
    if (r.status === "PRESENT") present++;
    if (!bySubject.has(r.subjectId)) bySubject.set(r.subjectId, { ...r.subject, present: 0, total: 0 });
    const b = bySubject.get(r.subjectId)!;
    b.total++;
    if (r.status === "PRESENT") b.present++;
  }

  const setting = await prisma.setting.findUnique({ where: { key: THRESHOLD_KEY } });
  const threshold = setting ? Number(setting.value) : DEFAULT_THRESHOLD;
  const overallPercentage = calcPercentage(present, records.length);

  res.json({
    success: true,
    data: {
      present,
      absent: records.length - present,
      total: records.length,
      percentage: overallPercentage,
      threshold,
      lowAttendance: overallPercentage < threshold,
      subjects: Array.from(bySubject.values())
        .map((s) => ({
          subjectName: s.name,
          subjectCode: s.code,
          present: s.present,
          absent: s.total - s.present,
          total: s.total,
          percentage: calcPercentage(s.present, s.total),
        }))
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
    },
  });
});

export const getMyAbsences = asyncHandler(async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
  if (!student) throw ApiError.notFound("Student profile not found");

  const records = await prisma.attendanceRecord.findMany({
    where: { studentId: student.id, status: "ABSENT" },
    include: {
      subject: { select: { name: true, code: true } },
      timetableEntry: { select: { startTime: true, endTime: true } },
      faculty: { select: { fullName: true, title: true } },
    },
    orderBy: { date: "desc" },
  });

  res.json({
    success: true,
    data: records.map((r) => ({
      date: r.date,
      subjectName: r.subject.name,
      subjectCode: r.subject.code,
      startTime: r.timetableEntry.startTime,
      endTime: r.timetableEntry.endTime,
      facultyName: r.faculty.title ? `${r.faculty.title} ${r.faculty.fullName}` : r.faculty.fullName,
    })),
  });
});

// ============================================================
// Low-attendance threshold (Admin-configurable, visible to all)
// ============================================================

export const getThreshold = asyncHandler(async (_req: Request, res: Response) => {
  const setting = await prisma.setting.findUnique({ where: { key: THRESHOLD_KEY } });
  res.json({ success: true, data: { percent: setting ? Number(setting.value) : DEFAULT_THRESHOLD } });
});

export const updateThreshold = asyncHandler(async (req: Request, res: Response) => {
  const { percent } = req.body as { percent: number };
  await prisma.setting.upsert({
    where: { key: THRESHOLD_KEY },
    update: { value: String(percent), updatedById: req.user!.userId },
    create: { key: THRESHOLD_KEY, value: String(percent), updatedById: req.user!.userId },
  });
  await recordAudit({ userId: req.user!.userId, action: "SETTING_UPDATED", targetType: "Setting", targetId: THRESHOLD_KEY });
  res.json({ success: true, data: { percent } });
});

// ============================================================
// LEAVE REQUESTS
// ============================================================

async function facultyTaughtClasses(facultyId: string) {
  const entries = await prisma.timetableEntry.findMany({
    where: { facultyId, isActive: true },
    distinct: ["departmentId", "year", "section"],
    select: { departmentId: true, year: true, section: true },
  });
  return entries;
}

export const submitLeave = asyncHandler(async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
  if (!student) throw ApiError.notFound("Student profile not found");

  const { leaveDate, reason } = req.body as { leaveDate: string; reason: string };

  const request = await prisma.leaveRequest.create({
    data: {
      studentId: student.id,
      departmentId: student.departmentId,
      year: student.year,
      section: student.section,
      leaveDate: new Date(leaveDate),
      reason,
    },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "LEAVE_REQUEST_SUBMITTED",
    targetType: "LeaveRequest",
    targetId: request.id,
  });

  res.status(201).json({ success: true, data: request });
});

export const myLeaveRequests = asyncHandler(async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
  if (!student) throw ApiError.notFound("Student profile not found");

  const requests = await prisma.leaveRequest.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: requests });
});

export const listLeaveRequests = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query as Record<string, string | undefined>;
  const requestedDept = req.query.departmentId as string | undefined;
  const year = req.query.year ? Number(req.query.year) : undefined;
  const section = req.query.section as string | undefined;

  type LeaveWhere = {
    status?: "PENDING" | "APPROVED" | "REJECTED";
    year?: number;
    section?: string;
    departmentId?: string;
    OR?: { departmentId: string; year: number; section: string }[];
  };
  const where: LeaveWhere = {
    status: status as "PENDING" | "APPROVED" | "REJECTED" | undefined,
    year,
    section,
  };

  if (req.user!.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.userId } });
    if (!faculty) throw ApiError.notFound("Faculty profile not found");
    const classes = await facultyTaughtClasses(faculty.id);
    where.OR = classes.map((c) => ({ departmentId: c.departmentId, year: c.year, section: c.section }));
    if (where.OR.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }
  } else {
    const departmentId = scopedDepartmentId(req, requestedDept);
    where.departmentId = departmentId || undefined;
  }

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: { student: { select: { studentId: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: requests });
});

export const reviewLeave = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, remarks } = req.body as { status: "APPROVED" | "REJECTED"; remarks?: string };

  const existing = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Leave request not found");

  if (req.user!.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.userId } });
    if (!faculty) throw ApiError.notFound("Faculty profile not found");
    const classes = await facultyTaughtClasses(faculty.id);
    const allowed = classes.some(
      (c) => c.departmentId === existing.departmentId && c.year === existing.year && c.section === existing.section
    );
    if (!allowed) throw ApiError.forbidden("You can only review leave requests for your own classes");
  } else {
    assertOwnBranch(req, existing.departmentId);
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status, remarks, reviewedById: req.user!.userId, reviewedAt: new Date() },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: status === "APPROVED" ? "LEAVE_REQUEST_APPROVED" : "LEAVE_REQUEST_REJECTED",
    targetType: "LeaveRequest",
    targetId: id,
  });

  res.json({ success: true, data: updated });
});
