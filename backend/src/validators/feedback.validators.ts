import { z } from "zod";

export const createFeedbackQuestionSchema = z.object({
  body: z.object({
    text: z.string().trim().min(3).max(300),
    order: z.number().int().min(0).optional(),
  }),
});

export const updateFeedbackQuestionSchema = z.object({
  body: z.object({
    text: z.string().trim().min(3).max(300).optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const reorderFeedbackQuestionsSchema = z.object({
  body: z.object({
    orderedIds: z.array(z.string()).min(1),
  }),
});

const ratingSchema = z.number().int().min(1).max(5);

export const submitFeedbackSchema = z.object({
  body: z.object({
    facultyId: z.string(),
    subjectId: z.string(),
    answers: z
      .array(
        z.object({
          questionId: z.string(),
          rating: ratingSchema,
        })
      )
      .min(1),
    comment: z.string().trim().max(1000).optional(),
  }),
});

export const feedbackReportQuerySchema = z.object({
  query: z.object({
    departmentId: z.string(),
    year: z.string(),
    section: z.string(),
    academicYear: z.string(),
  }),
});

export const feedbackFacultyDetailQuerySchema = z.object({
  query: z.object({
    departmentId: z.string(),
    year: z.string(),
    section: z.string(),
    academicYear: z.string(),
    facultyId: z.string(),
    subjectId: z.string(),
  }),
});

export const updateFeedbackEnabledSchema = z.object({
  body: z.object({
    enabled: z.boolean(),
  }),
});

export const publishFeedbackSchema = z.object({
  body: z.object({
    departmentId: z.string(),
    year: z.number().int(),
    section: z.string(),
    academicYear: z.string(),
  }),
});
