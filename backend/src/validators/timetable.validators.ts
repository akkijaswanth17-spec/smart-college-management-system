import { z } from "zod";

const day = z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const timeField = z.string().regex(timeRegex, "Time must be in HH:mm 24-hour format");

export const createTimetableEntrySchema = z.object({
  body: z
    .object({
      facultyId: z.string().min(1),
      subjectId: z.string().min(1),
      departmentId: z.string().min(1),
      year: z.coerce.number().int().min(1).max(6),
      section: z.string().trim().min(1).max(10),
      day,
      startTime: timeField,
      endTime: timeField,
      roomId: z.string().min(1),
      blockId: z.string().min(1),
      academicYear: z.string().trim().min(4).max(20),
      allowRoomConflict: z.coerce.boolean().optional().default(false),
    })
    .refine((d) => d.startTime < d.endTime, {
      message: "Start time must be before end time",
      path: ["endTime"],
    }),
});

export const updateTimetableEntrySchema = z.object({
  body: z.object({
    facultyId: z.string().min(1).optional(),
    subjectId: z.string().min(1).optional(),
    departmentId: z.string().min(1).optional(),
    year: z.coerce.number().int().min(1).max(6).optional(),
    section: z.string().trim().min(1).max(10).optional(),
    day: day.optional(),
    startTime: timeField.optional(),
    endTime: timeField.optional(),
    roomId: z.string().min(1).optional(),
    blockId: z.string().min(1).optional(),
    academicYear: z.string().trim().min(4).max(20).optional(),
    isActive: z.coerce.boolean().optional(),
    allowRoomConflict: z.coerce.boolean().optional().default(false),
  }),
  params: z.object({ id: z.string() }),
});
