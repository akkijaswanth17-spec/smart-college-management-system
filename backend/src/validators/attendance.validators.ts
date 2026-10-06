import { z } from "zod";

export const classDayQuerySchema = z.object({
  query: z.object({
    departmentId: z.string().optional(),
    year: z.string(),
    section: z.string(),
  }),
});

export const rosterQuerySchema = z.object({
  params: z.object({
    timetableEntryId: z.string(),
  }),
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

export const saveAttendanceSchema = z.object({
  body: z.object({
    timetableEntryId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    records: z
      .array(
        z.object({
          studentId: z.string(),
          status: z.enum(["PRESENT", "ABSENT"]),
        })
      )
      .min(1),
  }),
});

export const reportQuerySchema = z.object({
  query: z.object({
    departmentId: z.string().optional(),
    year: z.string(),
    section: z.string(),
    subjectId: z.string().optional(),
    facultyId: z.string().optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

export const thresholdUpdateSchema = z.object({
  body: z.object({
    percent: z.number().min(0).max(100),
  }),
});

export const submitLeaveSchema = z.object({
  body: z.object({
    leaveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().trim().min(3).max(1000),
  }),
});

export const leaveListQuerySchema = z.object({
  query: z.object({
    departmentId: z.string().optional(),
    year: z.string().optional(),
    section: z.string().optional(),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  }),
});

export const reviewLeaveSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    remarks: z.string().trim().max(500).optional(),
  }),
});
