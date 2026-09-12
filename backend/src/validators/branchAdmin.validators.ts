import { z } from "zod";

export const createBranchAdminSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100),
    branchId: z.string().trim().min(1).max(50),
    email: z.string().trim().email(),
    phone: z.string().trim().min(7).max(20),
    departmentId: z.string().trim().min(1),
    password: z.string().min(8).max(72).optional(),
  }),
});

export const updateBranchAdminSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100).optional(),
    branchId: z.string().trim().min(1).max(50).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
  }),
  params: z.object({ id: z.string() }),
});

export const resetBranchAdminPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(8).max(72).optional(),
  }),
  params: z.object({ id: z.string() }),
});
