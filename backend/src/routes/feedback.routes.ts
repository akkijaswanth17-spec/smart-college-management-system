import { Router } from "express";
import * as controller from "../controllers/feedback.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { resolveBranchScope } from "../middleware/branchScope.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createFeedbackQuestionSchema,
  updateFeedbackQuestionSchema,
  reorderFeedbackQuestionsSchema,
  submitFeedbackSchema,
  feedbackReportQuerySchema,
  feedbackFacultyDetailQuerySchema,
  publishFeedbackSchema,
  updateFeedbackEnabledSchema,
} from "../validators/feedback.validators";

const router = Router();

router.use(authenticate, resolveBranchScope);

// Module on/off switch — Admin decides whether Students can see/use it at all.
router.get("/enabled", controller.getFeedbackEnabled);
router.put("/enabled", requireRole("ADMIN"), validate(updateFeedbackEnabledSchema), controller.updateFeedbackEnabled);

// Questions — Admin manages the bank; any authenticated caller (Student, in
// practice) can fetch just the active ones to render the feedback form.
router.get("/questions", requireRole("ADMIN"), controller.listFeedbackQuestions);
router.get("/questions/active", controller.listActiveFeedbackQuestions);
router.post("/questions", requireRole("ADMIN"), validate(createFeedbackQuestionSchema), controller.createFeedbackQuestion);
router.put("/questions/:id", requireRole("ADMIN"), validate(updateFeedbackQuestionSchema), controller.updateFeedbackQuestion);
router.delete("/questions/:id", requireRole("ADMIN"), controller.deleteFeedbackQuestion);
router.post(
  "/questions/reorder",
  requireRole("ADMIN"),
  validate(reorderFeedbackQuestionsSchema),
  controller.reorderFeedbackQuestions
);

// Student — own targets + submission
router.get("/my-targets", requireRole("STUDENT"), controller.getMyFeedbackTargets);
router.post("/submit", requireRole("STUDENT"), validate(submitFeedbackSchema), controller.submitFeedback);

// Admin + Branch — reports + publish (Branch is always forced to its own
// department server-side via scopedDepartmentId, same as marks/attendance).
router.get(
  "/class-report",
  requireRole("ADMIN", "BRANCH"),
  validate(feedbackReportQuerySchema),
  controller.getFeedbackClassReport
);
router.get(
  "/faculty-list",
  requireRole("ADMIN", "BRANCH"),
  validate(feedbackReportQuerySchema),
  controller.getFeedbackFacultyList
);
router.get(
  "/faculty-detail",
  requireRole("ADMIN", "BRANCH"),
  validate(feedbackFacultyDetailQuerySchema),
  controller.getFeedbackFacultyDetail
);
router.get(
  "/publish-status",
  requireRole("ADMIN", "BRANCH"),
  validate(feedbackReportQuerySchema),
  controller.getFeedbackPublishStatus
);
router.get(
  "/submission-status",
  requireRole("ADMIN", "BRANCH"),
  validate(feedbackReportQuerySchema),
  controller.getFeedbackSubmissionStatus
);
router.post("/publish", requireRole("ADMIN", "BRANCH"), validate(publishFeedbackSchema), controller.publishFeedback);

// Faculty — own already-published feedback only
router.get("/my-feedback", requireRole("FACULTY"), controller.getMyPublishedFeedback);

export default router;
