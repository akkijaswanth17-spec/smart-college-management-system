import { z } from "zod";

export const createLostFoundSchema = z.object({
  body: z.object({
    itemName: z.string().trim().min(1).max(150),
    description: z.string().trim().min(1).max(2000),
    type: z.enum(["LOST", "FOUND"]),
    location: z.string().trim().min(1).max(200),
    date: z.coerce.date(),
    contactInfo: z.string().trim().min(3).max(200),
  }),
});

export const updateLostFoundSchema = z.object({
  body: z.object({
    itemName: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    location: z.string().trim().min(1).max(200).optional(),
    contactInfo: z.string().trim().min(3).max(200).optional(),
    status: z.enum(["LOST", "FOUND", "CLAIMED", "RESOLVED"]).optional(),
  }),
  params: z.object({ id: z.string() }),
});
