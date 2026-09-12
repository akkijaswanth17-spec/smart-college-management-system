import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { serializeUser } from "../utils/serializeUser";
import { hashPassword, generateTempPassword } from "../utils/password";
import { recordAudit } from "../services/audit.service";

export const listBranchAdmins = asyncHandler(async (_req: Request, res: Response) => {
  const branchAdmins = await prisma.branchAdmin.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      department: true,
      user: { select: { id: true, email: true, isActive: true, avatarUrl: true, createdAt: true } },
    },
  });
  res.json({ success: true, data: branchAdmins });
});

export const getBranchAdmin = asyncHandler(async (req: Request, res: Response) => {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { id: req.params.id },
    include: { department: true, user: true },
  });
  if (!branchAdmin) throw ApiError.notFound("Branch account not found");

  res.json({ success: true, data: { ...branchAdmin, user: serializeUser(branchAdmin.user) } });
});

export const createBranchAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, branchId, email, phone, departmentId, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  const [existingEmail, existingBranchId, dept, existingForDept] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedEmail } }),
    prisma.branchAdmin.findUnique({ where: { branchId } }),
    prisma.department.findUnique({ where: { id: departmentId } }),
    prisma.branchAdmin.findUnique({ where: { departmentId } }),
  ]);

  if (existingEmail) throw ApiError.conflict("An account with this email already exists");
  if (existingBranchId) throw ApiError.conflict("This Branch ID is already registered");
  if (!dept) throw ApiError.badRequest("Selected department does not exist");
  if (existingForDept) throw ApiError.conflict(`${dept.name} already has a branch account`);

  const tempPassword = password || generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: "BRANCH",
      mustChangePassword: true,
      branchAdmin: { create: { fullName, branchId, phone, departmentId } },
    },
    include: { branchAdmin: { include: { department: true } } },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "BRANCH_ADMIN_CREATED",
    targetType: "BranchAdmin",
    targetId: user.branchAdmin!.id,
    metadata: { departmentId },
  });

  res.status(201).json({
    success: true,
    data: { branchAdmin: { ...user.branchAdmin, user: serializeUser(user) }, tempPassword },
  });
});

export const updateBranchAdmin = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.branchAdmin.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Branch account not found");

  if (req.body.branchId && req.body.branchId !== existing.branchId) {
    const conflict = await prisma.branchAdmin.findUnique({ where: { branchId: req.body.branchId } });
    if (conflict) throw ApiError.conflict("This Branch ID is already registered");
  }

  const updated = await prisma.branchAdmin.update({
    where: { id: req.params.id },
    data: req.body,
    include: { department: true },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "BRANCH_ADMIN_UPDATED",
    targetType: "BranchAdmin",
    targetId: updated.id,
  });

  res.json({ success: true, data: updated });
});

export const deleteBranchAdmin = asyncHandler(async (req: Request, res: Response) => {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { id: req.params.id } });
  if (!branchAdmin) throw ApiError.notFound("Branch account not found");

  await prisma.user.update({ where: { id: branchAdmin.userId }, data: { isActive: false } });

  await recordAudit({
    userId: req.user!.userId,
    action: "BRANCH_ADMIN_DEACTIVATED",
    targetType: "BranchAdmin",
    targetId: branchAdmin.id,
  });

  res.json({ success: true, message: "Branch account deactivated" });
});

export const setBranchAdminActive = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.body as { isActive: boolean };
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { id: req.params.id } });
  if (!branchAdmin) throw ApiError.notFound("Branch account not found");

  await prisma.user.update({ where: { id: branchAdmin.userId }, data: { isActive } });

  await recordAudit({
    userId: req.user!.userId,
    action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    targetType: "BranchAdmin",
    targetId: branchAdmin.id,
  });

  res.json({ success: true, message: isActive ? "Branch account activated" : "Branch account deactivated" });
});

export const resetBranchAdminPassword = asyncHandler(async (req: Request, res: Response) => {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { id: req.params.id } });
  if (!branchAdmin) throw ApiError.notFound("Branch account not found");

  const newPassword = req.body.newPassword || generateTempPassword();
  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: branchAdmin.userId },
    data: { passwordHash, mustChangePassword: true },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "BRANCH_ADMIN_PASSWORD_RESET",
    targetType: "BranchAdmin",
    targetId: branchAdmin.id,
  });

  res.json({ success: true, data: { temporaryPassword: newPassword } });
});
