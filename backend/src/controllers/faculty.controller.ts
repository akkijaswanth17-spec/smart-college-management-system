import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { getPagination, buildMeta } from "../utils/pagination";
import { serializeUser } from "../utils/serializeUser";
import { hashPassword, generateTempPassword } from "../utils/password";
import { recordAudit } from "../services/audit.service";
import { assertOwnBranch, scopedDepartmentId } from "../middleware/branchScope.middleware";

export const listFaculty = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = getPagination(req);
  const { search, status } = req.query;
  const departmentId = scopedDepartmentId(req, req.query.departmentId ? String(req.query.departmentId) : undefined);

  const where = {
    ...(departmentId ? { departmentId } : {}),
    ...(status ? { status: String(status) as "ACTIVE" | "INACTIVE" } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: String(search), mode: "insensitive" as const } },
            { facultyId: { contains: String(search), mode: "insensitive" as const } },
            { user: { email: { contains: String(search), mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [faculty, total] = await Promise.all([
    prisma.faculty.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { department: true, user: { select: { id: true, email: true, isActive: true, avatarUrl: true, createdAt: true } } },
    }),
    prisma.faculty.count({ where }),
  ]);

  res.json({ success: true, data: faculty, meta: buildMeta(total, page, pageSize) });
});

export const getFaculty = asyncHandler(async (req: Request, res: Response) => {
  const faculty = await prisma.faculty.findUnique({
    where: { id: req.params.id },
    include: { department: true, user: true },
  });
  if (!faculty) throw ApiError.notFound("Faculty not found");

  if (req.user!.role === "FACULTY" && faculty.userId !== req.user!.userId) {
    throw ApiError.forbidden();
  }
  assertOwnBranch(req, faculty.departmentId);

  res.json({ success: true, data: { ...faculty, user: serializeUser(faculty.user) } });
});

export const createFaculty = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, title, facultyId, email, phone, designation, password } = req.body;
  const departmentId = scopedDepartmentId(req, req.body.departmentId)!;
  const normalizedEmail = email.toLowerCase();

  const [existingEmail, existingFacultyId, dept] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedEmail } }),
    prisma.faculty.findUnique({ where: { facultyId } }),
    prisma.department.findUnique({ where: { id: departmentId } }),
  ]);

  if (existingEmail) throw ApiError.conflict("An account with this email already exists");
  if (existingFacultyId) throw ApiError.conflict("This Faculty ID is already registered");
  if (!dept) throw ApiError.badRequest("Selected department does not exist");

  // Admin may set the initial password directly; otherwise one is generated.
  const tempPassword = password || generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: "FACULTY",
      mustChangePassword: true,
      faculty: { create: { fullName, title, facultyId, phone, departmentId, designation } },
    },
    include: { faculty: { include: { department: true } } },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "FACULTY_CREATED",
    targetType: "Faculty",
    targetId: user.faculty!.id,
    metadata: { facultyId },
  });

  // Temp password is returned exactly once, to the admin who created the account —
  // never logged, never retrievable again afterward.
  res.status(201).json({
    success: true,
    data: { faculty: { ...user.faculty, user: serializeUser(user) }, tempPassword },
  });
});

export const updateFaculty = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.faculty.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Faculty not found");
  assertOwnBranch(req, existing.departmentId);

  const { status, departmentId, ...rest } = req.body;
  // A branch admin can edit everything else but can never move faculty out of their own department.
  const deptUpdate = req.user!.role === "BRANCH" ? {} : departmentId ? { departmentId } : {};

  if (rest.facultyId && rest.facultyId !== existing.facultyId) {
    const conflict = await prisma.faculty.findUnique({ where: { facultyId: rest.facultyId } });
    if (conflict) throw ApiError.conflict("This Faculty ID is already registered");
  }

  const updated = await prisma.faculty.update({
    where: { id: req.params.id },
    data: { ...rest, ...deptUpdate, ...(status ? { status } : {}) },
    include: { department: true },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "FACULTY_UPDATED",
    targetType: "Faculty",
    targetId: updated.id,
  });

  res.json({ success: true, data: updated });
});

export const deleteFaculty = asyncHandler(async (req: Request, res: Response) => {
  const faculty = await prisma.faculty.findUnique({ where: { id: req.params.id } });
  if (!faculty) throw ApiError.notFound("Faculty not found");
  assertOwnBranch(req, faculty.departmentId);

  // Soft-delete via deactivation — never hard-delete a user with historical records attached.
  await prisma.user.update({ where: { id: faculty.userId }, data: { isActive: false } });

  await recordAudit({
    userId: req.user!.userId,
    action: "FACULTY_DEACTIVATED",
    targetType: "Faculty",
    targetId: faculty.id,
  });

  res.json({ success: true, message: "Faculty account deactivated" });
});

export const setFacultyActive = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.body as { isActive: boolean };
  const faculty = await prisma.faculty.findUnique({ where: { id: req.params.id } });
  if (!faculty) throw ApiError.notFound("Faculty not found");
  assertOwnBranch(req, faculty.departmentId);

  await prisma.user.update({ where: { id: faculty.userId }, data: { isActive } });

  await recordAudit({
    userId: req.user!.userId,
    action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    targetType: "Faculty",
    targetId: faculty.id,
  });

  res.json({ success: true, message: isActive ? "Faculty activated" : "Faculty deactivated" });
});

export const resetFacultyPassword = asyncHandler(async (req: Request, res: Response) => {
  const faculty = await prisma.faculty.findUnique({ where: { id: req.params.id } });
  if (!faculty) throw ApiError.notFound("Faculty not found");
  assertOwnBranch(req, faculty.departmentId);

  const newPassword = req.body.newPassword || generateTempPassword();
  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: faculty.userId },
    data: { passwordHash, mustChangePassword: true },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "FACULTY_PASSWORD_RESET",
    targetType: "Faculty",
    targetId: faculty.id,
  });

  res.json({ success: true, data: { temporaryPassword: newPassword } });
});
