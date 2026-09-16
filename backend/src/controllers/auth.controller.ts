import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as authService from "../services/auth.service";
import { prisma } from "../config/prisma";
import { serializeUser } from "../utils/serializeUser";
import { ApiError } from "../utils/apiError";
import { env } from "../config/env";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.cookie("token", result.token, COOKIE_OPTIONS);
  res.status(200).json({ success: true, data: result });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie("token");
  res.status(200).json({ success: true, message: "Logged out" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.userId);
  res.status(200).json({ success: true, data: user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user!.userId, currentPassword, newPassword);
  res.status(200).json({ success: true, message: "Password updated" });
});

export const updateEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await authService.updateEmail(req.user!.userId, email);
  res.status(200).json({ success: true, data: user });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await authService.requestPasswordReset(email);
  res.status(200).json({
    success: true,
    message: "If an account exists for that email, a reset code has been sent.",
    data: result,
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;
  await authService.resetPasswordWithCode(email, code, newPassword);
  res.status(200).json({ success: true, message: "Password reset successfully. You can now sign in." });
});

// Any logged-in user (student, faculty or admin) may upload their own profile photo.
export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("No image was uploaded");

  const avatarUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { avatarUrl },
  });

  res.status(200).json({ success: true, data: serializeUser(user) });
});
