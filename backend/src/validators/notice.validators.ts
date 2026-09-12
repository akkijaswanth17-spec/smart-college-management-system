import { z } from "zod";

const category = z.enum([
  "GENERAL",
  "ACADEMIC",
  "EXAMINATION",
  "EVENTS",
  "HOLIDAY",
  "PLACEMENT",
  "EMERGENCY",
]);
const priority = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const createNoticeSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().min(1).max(5000),
    category: category.default("GENERAL"),
    priority: priority.default("NORMAL"),
    publishedDate: z.coerce.date().optional(),
    expiryDate: z.coerce.date().optional(),
    isPublished: z.coerce.boolean().optional().default(false),
  }),
});

export const updateNoticeSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    category: category.optional(),
    priority: priority.optional(),
    publishedDate: z.coerce.date().optional(),
    expiryDate: z.coerce.date().optional(),
    isPublished: z.coerce.boolean().optional(),
  }),
  params: z.object({ id: z.string() }),
});
