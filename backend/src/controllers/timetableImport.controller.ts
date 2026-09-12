import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { prisma } from "../config/prisma";
import { extractTimetableFromImage } from "../services/ocr.service";
import { assertNoTimetableConflict } from "../services/timetable.service";
import { recordAudit } from "../services/audit.service";

/**
 * Step 1: upload a timetable photo. Runs OCR and returns raw text plus
 * best-effort structured row guesses. Nothing is written to the database
 * here — this is preview-only.
 */
export const uploadTimetableImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("An image file is required");

  const { rawText, rows } = await extractTimetableFromImage(req.file.path);

  res.status(200).json({
    success: true,
    data: {
      imageUrl: `/uploads/timetable/${req.file.filename}`,
      rawText,
      rows,
    },
  });
});

const confirmRowSchema = z.object({
  facultyId: z.string().min(1),
  subjectId: z.string().min(1),
  departmentId: z.string().min(1),
  year: z.coerce.number().int().min(1).max(6),
  section: z.string().min(1),
  day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  roomId: z.string().min(1),
  blockId: z.string().min(1),
  academicYear: z.string().min(4),
});

export const confirmTimetableSchema = z.object({
  body: z.object({
    rows: z.array(confirmRowSchema).min(1),
  }),
});

type ConfirmRow = z.infer<typeof confirmRowSchema>;

/**
 * Step 2: admin has reviewed/corrected every row in the UI and explicitly
 * confirms. Only now do we validate against real entities and write to
 * the database — never automatically from raw OCR output.
 */
export const confirmTimetableImport = asyncHandler(async (req: Request, res: Response) => {
  const rows = req.body.rows as ConfirmRow[];

  const created: string[] = [];
  const errors: { index: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      await assertNoTimetableConflict({
        facultyId: row.facultyId,
        roomId: row.roomId,
        day: row.day,
        startTime: row.startTime,
        endTime: row.endTime,
        academicYear: row.academicYear,
      });
      const entry = await prisma.timetableEntry.create({ data: row });
      created.push(entry.id);
    } catch (err) {
      errors.push({ index: i, message: err instanceof ApiError ? err.message : "Failed to save row" });
    }
  }

  await recordAudit({
    userId: req.user!.userId,
    action: "TIMETABLE_IMPORTED",
    targetType: "TimetableEntry",
    metadata: { source: "IMAGE_OCR", created: created.length, failed: errors.length },
  });

  res.status(201).json({ success: true, data: { created: created.length, failed: errors.length, errors } });
});
