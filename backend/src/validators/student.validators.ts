import { z } from "zod";

export const createStudentSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100),
    studentId: z.string().trim().toUpperCase().min(1).max(50),
    email: z.string().trim().email(),
    phone: z.string().trim().min(7).max(20),
    departmentId: z.string().trim().min(1),
    year: z.coerce.number().int().min(1).max(6),
    semester: z.coerce.number().int().min(1).max(6).nullable().optional(),
    section: z.string().trim().min(1).max(10),
    password: z.string().min(8).max(72).optional(),
  }),
});

export const updateStudentSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100).optional(),
    studentId: z.string().trim().toUpperCase().min(1).max(50).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
    departmentId: z.string().trim().min(1).optional(),
    year: z.coerce.number().int().min(1).max(6).optional(),
    semester: z.coerce.number().int().min(1).max(6).nullable().optional(),
    section: z.string().trim().min(1).max(10).optional(),
  }),
  params: z.object({ id: z.string() }),
});
