import { z } from "zod";

export const studentReportParamsSchema = z.object({
  params: z.object({ studentId: z.string().trim().min(1).max(50) }),
});

export const facultyReportParamsSchema = z.object({
  params: z.object({ facultyId: z.string().trim().min(1).max(50) }),
});
