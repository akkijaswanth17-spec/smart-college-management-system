import { z } from "zod";

export const createFacultySchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100),
    title: z.string().trim().max(10).optional(),
    facultyId: z.string().trim().min(1).max(50),
    email: z.string().trim().email(),
    phone: z.string().trim().min(7).max(20),
    departmentId: z.string().trim().min(1),
    designation: z.string().trim().min(1).max(100),
    password: z.string().min(8).max(72).optional(),
  }),
});

export const updateFacultySchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100).optional(),
    title: z.string().trim().max(10).nullable().optional(),
    facultyId: z.string().trim().min(1).max(50).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
    departmentId: z.string().trim().min(1).optional(),
    designation: z.string().trim().min(1).max(100).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  }),
  params: z.object({ id: z.string() }),
});

export const resetFacultyPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(8).max(72).optional(),
  }),
  params: z.object({ id: z.string() }),
});
