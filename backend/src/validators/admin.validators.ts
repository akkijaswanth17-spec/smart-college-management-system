import { z } from "zod";

export const updateAdminSelfSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100),
  }),
});
