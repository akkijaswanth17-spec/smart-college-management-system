import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { recordAudit } from "../services/audit.service";

const currentAcademicYear = () => `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

// ============================================================
// ADMIN — question bank management
// ============================================================

export const listFeedbackQuestions = asyncHandler(async (_req: Request, res: Response) => {
  const questions = await prisma.feedbackQuestion.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  res.json({ success: true, data: questions });
});

export const listActiveFeedbackQuestions = asyncHandler(async (_req: Request, res: Response) => {
  const questions = await prisma.feedbackQuestion.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  res.json({ success: true, data: questions });
});

export const createFeedbackQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { text, order } = req.body as { text: string; order?: number };

  let nextOrder = order;
  if (nextOrder === undefined) {
    const last = await prisma.feedbackQuestion.findFirst({ orderBy: { order: "desc" } });
    nextOrder = (last?.order ?? -1) + 1;
  }

  const question = await prisma.feedbackQuestion.create({ data: { text, order: nextOrder } });

  await recordAudit({
    userId: req.user!.userId,
    action: "FEEDBACK_QUESTION_CREATED",
    targetType: "FeedbackQuestion",
    targetId: question.id,
    metadata: { text },
  });

  res.status(201).json({ success: true, data: question });
});

export const updateFeedbackQuestion = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.feedbackQuestion.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Feedback question not found");

  const question = await prisma.feedbackQuestion.update({
    where: { id: req.params.id },
    data: req.body,
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "FEEDBACK_QUESTION_UPDATED",
    targetType: "FeedbackQuestion",
    targetId: question.id,
    metadata: req.body,
  });

  res.json({ success: true, data: question });
});

export const deleteFeedbackQuestion = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.feedbackQuestion.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Feedback question not found");

  const answerCount = await prisma.feedbackAnswer.count({ where: { questionId: req.params.id } });
  if (answerCount > 0) {
    throw ApiError.conflict("This question already has feedback responses — disable it instead of deleting it.");
  }

  await prisma.feedbackQuestion.delete({ where: { id: req.params.id } });

  await recordAudit({
    userId: req.user!.userId,
    action: "FEEDBACK_QUESTION_DELETED",
    targetType: "FeedbackQuestion",
    targetId: req.params.id,
    metadata: { text: existing.text },
  });

  res.json({ success: true, message: "Question deleted" });
});

export const reorderFeedbackQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { orderedIds } = req.body as { orderedIds: string[] };

  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.feedbackQuestion.update({ where: { id }, data: { order: index } }))
  );

  const questions = await prisma.feedbackQuestion.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  res.json({ success: true, data: questions });
});

// ============================================================
// STUDENT — targets derived from own timetable, submission
// ============================================================

export const getMyFeedbackTargets = asyncHandler(async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
  if (!student) throw ApiError.notFound("Student profile not found");

  const academicYear = currentAcademicYear();

  const entries = await prisma.timetableEntry.findMany({
    where: { departmentId: student.departmentId, year: student.year, section: student.section, isActive: true },
    distinct: ["facultyId", "subjectId"],
    select: {
      facultyId: true,
      subjectId: true,
      faculty: { select: { fullName: true, title: true } },
      subject: { select: { name: true, code: true } },
    },
  });

  const submissions = await prisma.feedbackSubmission.findMany({
    where: { studentId: student.id, academicYear },
    select: { facultyId: true, subjectId: true },
  });
  const submittedSet = new Set(submissions.map((s) => `${s.facultyId}:${s.subjectId}`));

  const targets = entries
    .map((e) => ({
      facultyId: e.facultyId,
      facultyName: e.faculty.title ? `${e.faculty.title} ${e.faculty.fullName}` : e.faculty.fullName,
      subjectId: e.subjectId,
      subjectName: e.subject.name,
      subjectCode: e.subject.code,
      submitted: submittedSet.has(`${e.facultyId}:${e.subjectId}`),
    }))
    .sort((a, b) => a.facultyName.localeCompare(b.facultyName) || a.subjectName.localeCompare(b.subjectName));

  res.json({
    success: true,
    data: {
      academicYear,
      pendingCount: targets.filter((t) => !t.submitted).length,
      targets,
    },
  });
});

export const submitFeedback = asyncHandler(async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
  if (!student) throw ApiError.notFound("Student profile not found");

  const { facultyId, subjectId, answers, comment } = req.body as {
    facultyId: string;
    subjectId: string;
    answers: { questionId: string; rating: number }[];
    comment?: string;
  };
  const academicYear = currentAcademicYear();

  // Only a faculty/subject genuinely on this student's own timetable may be rated —
  // never trust the client to only submit for real targets.
  const onTimetable = await prisma.timetableEntry.findFirst({
    where: {
      departmentId: student.departmentId,
      year: student.year,
      section: student.section,
      facultyId,
      subjectId,
      isActive: true,
    },
  });
  if (!onTimetable) throw ApiError.badRequest("This faculty does not teach this subject for your class");

  const activeQuestions = await prisma.feedbackQuestion.findMany({ where: { isActive: true }, select: { id: true } });
  const activeIds = new Set(activeQuestions.map((q) => q.id));
  const answeredIds = new Set(answers.map((a) => a.questionId));

  if (activeIds.size === 0) throw ApiError.badRequest("There are no feedback questions configured yet");
  const missing = [...activeIds].some((id) => !answeredIds.has(id));
  if (missing || answers.some((a) => !activeIds.has(a.questionId))) {
    throw ApiError.badRequest("Please answer every question before submitting");
  }

  const existing = await prisma.feedbackSubmission.findUnique({
    where: {
      studentId_facultyId_subjectId_academicYear: { studentId: student.id, facultyId, subjectId, academicYear },
    },
  });
  if (existing) throw ApiError.conflict("Feedback already submitted for this faculty.");

  const submission = await prisma.feedbackSubmission.create({
    data: {
      studentId: student.id,
      facultyId,
      subjectId,
      departmentId: student.departmentId,
      year: student.year,
      section: student.section,
      academicYear,
      comment: comment && comment.length > 0 ? comment : undefined,
      answers: {
        create: answers.map((a) => ({ questionId: a.questionId, rating: a.rating })),
      },
    },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "FEEDBACK_SUBMITTED",
    targetType: "FeedbackSubmission",
    targetId: submission.id,
    metadata: { facultyId, subjectId, academicYear },
  });

  res.status(201).json({ success: true, message: "Feedback submitted successfully." });
});

// ============================================================
// Shared aggregation helper — used by both the Admin drill-down
// report and Faculty's own (already-published) feedback view.
// ============================================================

async function buildFeedbackDetail(params: {
  facultyId: string;
  subjectId: string;
  departmentId: string;
  year: number;
  section: string;
  academicYear: string;
}) {
  const [faculty, subject, department, allQuestions, submissionCount, comments, grouped, overallAvg] = await Promise.all([
    prisma.faculty.findUnique({ where: { id: params.facultyId }, select: { fullName: true, title: true } }),
    prisma.subject.findUnique({ where: { id: params.subjectId }, select: { name: true, code: true } }),
    prisma.department.findUnique({ where: { id: params.departmentId }, select: { name: true, code: true } }),
    prisma.feedbackQuestion.findMany({ where: { isActive: true }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
    prisma.feedbackSubmission.count({
      where: {
        facultyId: params.facultyId,
        subjectId: params.subjectId,
        departmentId: params.departmentId,
        year: params.year,
        section: params.section,
        academicYear: params.academicYear,
      },
    }),
    prisma.feedbackSubmission.findMany({
      where: {
        facultyId: params.facultyId,
        subjectId: params.subjectId,
        departmentId: params.departmentId,
        year: params.year,
        section: params.section,
        academicYear: params.academicYear,
        comment: { not: null },
      },
      select: { comment: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedbackAnswer.groupBy({
      by: ["questionId", "rating"],
      where: {
        submission: {
          facultyId: params.facultyId,
          subjectId: params.subjectId,
          departmentId: params.departmentId,
          year: params.year,
          section: params.section,
          academicYear: params.academicYear,
        },
      },
      _count: { _all: true },
    }),
    prisma.feedbackAnswer.aggregate({
      where: {
        submission: {
          facultyId: params.facultyId,
          subjectId: params.subjectId,
          departmentId: params.departmentId,
          year: params.year,
          section: params.section,
          academicYear: params.academicYear,
        },
      },
      _avg: { rating: true },
    }),
  ]);

  if (!faculty) throw ApiError.notFound("Faculty not found");
  if (!subject) throw ApiError.notFound("Subject not found");
  if (!department) throw ApiError.notFound("Department not found");

  const countsByQuestion = new Map<string, Record<1 | 2 | 3 | 4 | 5, number>>();
  for (const row of grouped) {
    if (!countsByQuestion.has(row.questionId)) {
      countsByQuestion.set(row.questionId, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    }
    countsByQuestion.get(row.questionId)![row.rating as 1 | 2 | 3 | 4 | 5] = row._count._all;
  }

  const questions = allQuestions.map((q) => ({
    id: q.id,
    text: q.text,
    counts: countsByQuestion.get(q.id) ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  }));

  // avg rating out of 5, converted to a percentage — mathematically identical
  // to (totalScore / (questionCount * studentCount * 5)) * 100.
  const percentage = overallAvg._avg.rating ? Math.round(overallAvg._avg.rating * 20 * 100) / 100 : 0;

  return {
    facultyId: params.facultyId,
    facultyName: faculty.title ? `${faculty.title} ${faculty.fullName}` : faculty.fullName,
    subjectId: params.subjectId,
    subjectName: subject.name,
    subjectCode: subject.code,
    departmentName: department.name,
    departmentCode: department.code,
    year: params.year,
    section: params.section,
    academicYear: params.academicYear,
    submissionCount,
    percentage,
    questions,
    comments: comments.map((c) => c.comment!).filter((c) => c.trim().length > 0),
  };
}

// ============================================================
// ADMIN — reports + publish
// ============================================================

export const getFeedbackClassReport = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, year, section, academicYear } = req.query as Record<string, string>;
  const yearNum = Number(year);

  const pairs = await prisma.timetableEntry.findMany({
    where: { departmentId, year: yearNum, section, isActive: true },
    distinct: ["facultyId", "subjectId"],
    select: {
      facultyId: true,
      subjectId: true,
      faculty: { select: { fullName: true, title: true } },
      subject: { select: { name: true, code: true } },
    },
  });

  const rows = await Promise.all(
    pairs.map(async (p) => {
      const avg = await prisma.feedbackAnswer.aggregate({
        where: {
          submission: { facultyId: p.facultyId, subjectId: p.subjectId, departmentId, year: yearNum, section, academicYear },
        },
        _avg: { rating: true },
      });
      return {
        facultyId: p.facultyId,
        facultyName: p.faculty.title ? `${p.faculty.title} ${p.faculty.fullName}` : p.faculty.fullName,
        subjectId: p.subjectId,
        subjectName: p.subject.name,
        subjectCode: p.subject.code,
        percentage: avg._avg.rating ? Math.round(avg._avg.rating * 20 * 100) / 100 : null,
      };
    })
  );

  rows.sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  res.json({ success: true, data: rows });
});

export const getFeedbackFacultyList = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, year, section } = req.query as Record<string, string>;

  const pairs = await prisma.timetableEntry.findMany({
    where: { departmentId, year: Number(year), section, isActive: true },
    distinct: ["facultyId", "subjectId"],
    select: {
      facultyId: true,
      subjectId: true,
      faculty: { select: { fullName: true, title: true } },
      subject: { select: { name: true, code: true } },
    },
  });

  const rows = pairs
    .map((p) => ({
      facultyId: p.facultyId,
      facultyName: p.faculty.title ? `${p.faculty.title} ${p.faculty.fullName}` : p.faculty.fullName,
      subjectId: p.subjectId,
      subjectName: p.subject.name,
      subjectCode: p.subject.code,
    }))
    .sort((a, b) => a.facultyName.localeCompare(b.facultyName));

  res.json({ success: true, data: rows });
});

export const getFeedbackFacultyDetail = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, year, section, academicYear, facultyId, subjectId } = req.query as Record<string, string>;
  const detail = await buildFeedbackDetail({ facultyId, subjectId, departmentId, year: Number(year), section, academicYear });
  res.json({ success: true, data: detail });
});

export const getFeedbackPublishStatus = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, year, section, academicYear } = req.query as Record<string, string>;
  const publish = await prisma.feedbackPublish.findUnique({
    where: { departmentId_year_section_academicYear: { departmentId, year: Number(year), section, academicYear } },
  });
  res.json({ success: true, data: { published: !!publish, publishedAt: publish?.publishedAt ?? null } });
});

export const publishFeedback = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, year, section, academicYear } = req.body as {
    departmentId: string;
    year: number;
    section: string;
    academicYear: string;
  };

  const publish = await prisma.feedbackPublish.upsert({
    where: { departmentId_year_section_academicYear: { departmentId, year, section, academicYear } },
    create: { departmentId, year, section, academicYear, publishedById: req.user!.userId },
    update: { publishedById: req.user!.userId, publishedAt: new Date() },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: "FEEDBACK_PUBLISHED",
    targetType: "FeedbackPublish",
    targetId: publish.id,
    metadata: { departmentId, year, section, academicYear },
  });

  res.json({ success: true, message: "Faculty feedback has been successfully posted." });
});

// ============================================================
// FACULTY — own published feedback only
// ============================================================

export const getMyPublishedFeedback = asyncHandler(async (req: Request, res: Response) => {
  const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.userId } });
  if (!faculty) throw ApiError.notFound("Faculty profile not found");

  const publishes = await prisma.feedbackPublish.findMany();

  const results = [];
  for (const pub of publishes) {
    const subjects = await prisma.feedbackSubmission.findMany({
      where: {
        facultyId: faculty.id,
        departmentId: pub.departmentId,
        year: pub.year,
        section: pub.section,
        academicYear: pub.academicYear,
      },
      distinct: ["subjectId"],
      select: { subjectId: true },
    });

    for (const s of subjects) {
      const detail = await buildFeedbackDetail({
        facultyId: faculty.id,
        subjectId: s.subjectId,
        departmentId: pub.departmentId,
        year: pub.year,
        section: pub.section,
        academicYear: pub.academicYear,
      });
      results.push(detail);
    }
  }

  results.sort(
    (a, b) => b.academicYear.localeCompare(a.academicYear) || a.subjectName.localeCompare(b.subjectName)
  );

  res.json({ success: true, data: results });
});
