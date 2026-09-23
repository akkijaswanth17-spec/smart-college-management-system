import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { getPagination, buildMeta } from "../utils/pagination";
import { serializeUser } from "../utils/serializeUser";
import { recordAudit } from "../services/audit.service";
import { hashPassword } from "../utils/password";
import { assertOwnBranch, scopedDepartmentId } from "../middleware/branchScope.middleware";

export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, studentId, email, phone, year, semester, section, password } = req.body;
  const departmentId = scopedDepartmentId(req, req.body.departmentId)!;
  const normalizedEmail = email.toLowerCase();

  const [existingEmail, existingStudentId, dept] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedEmail } }),
    prisma.student.findUnique({ where: { studentId } }),
    prisma.department.findUnique({ where: { id: departmentId } }),
  ]);

  if (existingEmail) throw ApiError.conflict("An account with this email already exists");
  if (existingStudentId) throw ApiError.conflict("This Student ID / Roll Number is already registered");
  if (!dept) throw ApiError.badRequest("Selected department does not exist");

  // Admin may set the initial password directly; otherwise it defaults to the
  // student's own Roll Number, so it's always something the student already knows.
  const tempPassword = password || studentId;
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: "STUDENT",
      // The Roll Number is a permanent password for students, not a one-time
      // temp password — never force a change on first login.
      mustChangePassword: false,
      student: { create: { fullName, studentId, phone, departmentId, year, semester, section } },
    },
    include: { student: { include: { department: true } } },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "STUDENT_CREATED",
    targetType: "Student",
    targetId: user.student!.id,
    metadata: { studentId },
  });

  // Temp password is returned exactly once, to the admin who created the account —
  // never logged, never retrievable again afterward.
  res.status(201).json({
    success: true,
    data: { student: { ...user.student, user: serializeUser(user) }, tempPassword },
  });
});

export const listStudents = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = getPagination(req, 50, 100);
  const { search, year, section } = req.query;
  const departmentId = scopedDepartmentId(req, req.query.departmentId ? String(req.query.departmentId) : undefined);

  const where = {
    ...(departmentId ? { departmentId } : {}),
    ...(year ? { year: parseInt(String(year), 10) } : {}),
    ...(section ? { section: String(section) } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: String(search), mode: "insensitive" as const } },
            { studentId: { contains: String(search), mode: "insensitive" as const } },
            { user: { email: { contains: String(search), mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { department: true, user: { select: { id: true, email: true, isActive: true, avatarUrl: true, createdAt: true } } },
    }),
    prisma.student.count({ where }),
  ]);

  res.json({ success: true, data: students, meta: buildMeta(total, page, pageSize) });
});

export const getStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: { department: true, user: true },
  });
  if (!student) throw ApiError.notFound("Student not found");

  // Students may only view their own profile; faculty/admin may view any; branch admins only their own department.
  if (req.user!.role === "STUDENT" && student.userId !== req.user!.userId) {
    throw ApiError.forbidden();
  }
  assertOwnBranch(req, student.departmentId);

  res.json({ success: true, data: { ...student, user: serializeUser(student.user) } });
});

export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Student not found");

  if (req.user!.role === "STUDENT" && existing.userId !== req.user!.userId) {
    throw ApiError.forbidden();
  }
  assertOwnBranch(req, existing.departmentId);

  // Students may update their own contact info but not academic placement fields
  // (or their Roll Number — only an Admin can correct that). A branch admin may
  // edit everything else but can never move a student out of their own department.
  const allowedFields =
    req.user!.role === "STUDENT"
      ? { phone: req.body.phone }
      : req.user!.role === "BRANCH"
        ? { ...req.body, departmentId: existing.departmentId }
        : req.body;

  if (allowedFields.studentId && allowedFields.studentId !== existing.studentId) {
    const conflict = await prisma.student.findUnique({ where: { studentId: allowedFields.studentId } });
    if (conflict) throw ApiError.conflict("This Student ID / Roll Number is already in use");
  }

  const updated = await prisma.student.update({
    where: { id: req.params.id },
    data: allowedFields,
    include: { department: true },
  });

  if (req.user!.role !== "STUDENT") {
    await recordAudit({
      userId: req.user!.userId,
      action: "STUDENT_UPDATED",
      targetType: "Student",
      targetId: updated.id,
    });
  }

  res.json({ success: true, data: updated });
});

export const deleteStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!student) throw ApiError.notFound("Student not found");
  assertOwnBranch(req, student.departmentId);

  // Soft-delete via deactivation — never hard-delete a user with historical records attached
  // (notices, lost & found posts, WhatsApp requests, audit log entries, etc.).
  await prisma.user.update({ where: { id: student.userId }, data: { isActive: false } });

  await recordAudit({
    userId: req.user!.userId,
    action: "USER_DEACTIVATED",
    targetType: "Student",
    targetId: student.id,
  });

  res.json({ success: true, message: "Student account deactivated" });
});

export const setStudentActive = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.body as { isActive: boolean };
  const student = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!student) throw ApiError.notFound("Student not found");
  assertOwnBranch(req, student.departmentId);

  await prisma.user.update({ where: { id: student.userId }, data: { isActive } });

  await recordAudit({
    userId: req.user!.userId,
    action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    targetType: "Student",
    targetId: student.id,
  });

  res.json({ success: true, message: isActive ? "Student activated" : "Student deactivated" });
});
