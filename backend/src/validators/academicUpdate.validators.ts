import { z } from "zod";

const category = z.enum([
  "EXAM_SCHEDULE",
  "ASSIGNMENT",
  "INTERNAL_ASSESSMENT",
  "ACADEMIC_CALENDAR",
  "DEPARTMENT_ANNOUNCEMENT",
  "IMPORTANT_DEADLINE",
]);

export const createAcademicUpdateSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().min(1).max(5000),
    departmentId: z.string().trim().optional(),
    year: z.coerce.number().int().min(1).max(6).optional(),
    section: z.string().trim().max(10).optional(),
    category: category.default("DEPARTMENT_ANNOUNCEMENT"),
    date: z.coerce.date(),
  }),
});

export const updateAcademicUpdateSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    departmentId: z.string().trim().optional(),
    year: z.coerce.number().int().min(1).max(6).optional(),
    section: z.string().trim().max(10).optional(),
    category: category.optional(),
    date: z.coerce.date().optional(),
  }),
  params: z.object({ id: z.string() }),
});
