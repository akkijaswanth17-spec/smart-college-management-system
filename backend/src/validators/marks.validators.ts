import { z } from "zod";

const examTypeSchema = z.enum(["mid1", "mid2", "semester"]);

export const getMarksSheetSchema = z.object({
  query: z.object({
    departmentId: z.string().trim().min(1),
    year: z.coerce.number().int().min(1).max(6),
    section: z.string().trim().min(1).max(10),
    examType: examTypeSchema,
    academicYear: z.string().trim().min(1).optional(),
  }),
});

// Plain z.number() (no coerce) — coercion would turn a JSON `null` (meaning
// "not entered yet") into 0 via Number(null), silently corrupting blanks.
const scoreField = z.number().min(0).max(999).nullable();

export const saveMarksSheetSchema = z.object({
  body: z.object({
    examType: examTypeSchema,
    academicYear: z.string().trim().min(1),
    entries: z
      .array(
        z.object({
          studentId: z.string().trim().min(1),
          subjectId: z.string().trim().min(1),
          value: scoreField,
        })
      )
      .min(1)
      .max(2000),
  }),
});
