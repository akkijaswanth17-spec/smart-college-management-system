import { z } from "zod";

export const getPromotionSheetSchema = z.object({
  query: z.object({
    departmentId: z.string().trim().min(1),
    year: z.coerce.number().int().min(1).max(3),
    section: z.string().trim().min(1).max(10),
  }),
});

export const promoteStudentsSchema = z.object({
  body: z.object({
    toYear: z.number().int().min(1).max(3),
    toSemester: z.number().int().min(1).max(6).nullable(),
    academicYear: z.string().trim().min(1).max(20),
    promote: z.array(z.string().trim().min(1)).max(500),
    detain: z.array(z.string().trim().min(1)).max(500),
    condone: z.array(z.string().trim().min(1)).max(500),
  }),
});
