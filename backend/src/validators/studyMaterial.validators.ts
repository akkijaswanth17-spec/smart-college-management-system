import { z } from "zod";

const type = z.enum(["ASSIGNMENT", "NOTES", "QUESTION_BANK"]);

export const createStudyMaterialSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200),
    type,
    // Ignored for a BRANCH caller (forced to their own department server-side).
    departmentId: z.string().optional(),
  }),
});
