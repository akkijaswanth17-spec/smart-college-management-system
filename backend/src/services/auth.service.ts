import crypto from "crypto";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { serializeUser } from "../utils/serializeUser";
import { sendPasswordResetEmail } from "./email.service";
import { env } from "../config/env";

const RESET_CODE_TTL_MINUTES = 10;

/**
 * `identifier` may be an email address (any role) or a student's Roll
 * Number / Student ID — students can sign in with either.
 */
export async function login(identifier: string, password: string) {
  const trimmed = identifier.trim();
  const isEmail = trimmed.includes("@");

  const include = {
    student: { include: { department: true } },
    faculty: { include: { department: true } },
    admin: true,
    branchAdmin: { include: { department: true } },
  };

  const user = isEmail
    ? await prisma.user.findUnique({
        where: { email: trimmed.toLowerCase() },
        include,
      })
    : await prisma.user.findFirst({
        where: { student: { studentId: trimmed } },
        include,
      });

  if (!user) throw ApiError.unauthorized("Invalid email or password");
  if (!user.isActive) throw ApiError.forbidden("This account has been deactivated. Contact the administrator.");

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  const token = signToken({ userId: user.id, role: user.role });
  return { token, user: serializeUser(user) };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: { include: { department: true } },
      faculty: { include: { department: true } },
      admin: true,
      branchAdmin: { include: { department: true } },
    },
  });
  if (!user) throw ApiError.notFound("User not found");
  return serializeUser(user);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest("Current password is incorrect");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });
}

/**
 * Step 1 of "forgot password": issue a short-lived 6-digit code. Always
 * responds the same way whether or not the account exists, so the API
 * never leaks which emails are registered.
 */
export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user || !user.isActive) {
    return { emailSent: false, devCode: undefined as string | undefined };
  }

  // Invalidate any previous unused codes before issuing a new one.
  await prisma.passwordResetCode.deleteMany({ where: { userId: user.id, usedAt: null } });

  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetCode.create({ data: { userId: user.id, codeHash, expiresAt } });

  const { sent } = await sendPasswordResetEmail(user.email, code);

  return {
    emailSent: sent,
    // Dev-only convenience so the flow can be tested end-to-end before a
    // real email provider is configured — never populated in production.
    devCode: !sent && !env.isProduction ? code : undefined,
  };
}

/** Step 2: verify the code and set the new password in one call. */
export async function resetPasswordWithCode(email: string, code: string, newPassword: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) throw ApiError.badRequest("Invalid or expired code");

  const candidates = await prisma.passwordResetCode.findMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  let matchedId: string | undefined;
  for (const candidate of candidates) {
    if (await comparePassword(code, candidate.codeHash)) {
      matchedId = candidate.id;
      break;
    }
  }

  if (!matchedId) throw ApiError.badRequest("Invalid or expired code");

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } }),
    prisma.passwordResetCode.update({ where: { id: matchedId }, data: { usedAt: new Date() } }),
  ]);
}
