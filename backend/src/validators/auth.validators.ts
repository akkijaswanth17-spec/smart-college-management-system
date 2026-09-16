import { z } from "zod";

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long");

export const loginSchema = z.object({
  body: z.object({
    // Accepts either an email address or a student Roll Number / Student ID —
    // see auth.service.ts login() for how the identifier is resolved.
    email: z.string().trim().min(1, "Email or Roll Number is required"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1),
      newPassword: password,
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
});

export const updateEmailSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      email: z.string().trim().email(),
      code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
      newPassword: password,
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
});
