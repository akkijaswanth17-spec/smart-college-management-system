import { z } from "zod";

export const createWhatsAppGroupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(150),
    subject: z.string().trim().min(1).max(150),
    department: z.string().trim().max(150).optional(),
    year: z.coerce.number().int().min(1).max(6).optional(),
    section: z.string().trim().max(10).optional(),
    inviteLink: z.string().trim().url(),
    isActive: z.coerce.boolean().optional().default(true),
  }),
});

export const createWhatsAppRequestSchema = z.object({
  body: z.object({
    department: z.string().trim().min(1),
    year: z.coerce.number().int().min(1).max(6),
    section: z.string().trim().min(1).max(10),
    phone: z.string().trim().min(7).max(20),
    groupId: z.string().min(1),
    reason: z.string().trim().min(1).max(1000),
  }),
});

export const updateWhatsAppRequestSchema = z.object({
  body: z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  }),
  params: z.object({ id: z.string() }),
});
