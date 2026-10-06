import { Router } from "express";
import * as controller from "../controllers/attendance.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { resolveBranchScope } from "../middleware/branchScope.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  classDayQuerySchema,
  rosterQuerySchema,
  saveAttendanceSchema,
  reportQuerySchema,
  thresholdUpdateSchema,
  submitLeaveSchema,
  leaveListQuerySchema,
  reviewLeaveSchema,
} from "../validators/attendance.validators";

const router = Router();

router.use(authenticate, resolveBranchScope);

// Low-attendance threshold — any authenticated role can read it, only Admin sets it.
router.get("/threshold", controller.getThreshold);
router.put("/threshold", requireRole("ADMIN"), validate(thresholdUpdateSchema), controller.updateThreshold);

// Student — own attendance + leave requests
router.get("/me", requireRole("STUDENT"), controller.getMyAttendance);
router.get("/me/absences", requireRole("STUDENT"), controller.getMyAbsences);
router.post("/leave", requireRole("STUDENT"), validate(submitLeaveSchema), controller.submitLeave);
router.get("/leave/mine", requireRole("STUDENT"), controller.myLeaveRequests);

// Faculty — today's own periods
router.get("/faculty/today", requireRole("FACULTY"), controller.getMyTodayPeriods);

// Branch / Admin — today's periods for a chosen class
router.get(
  "/class/today",
  requireRole("BRANCH", "ADMIN"),
  validate(classDayQuerySchema),
  controller.getClassTodayPeriods
);

// Shared — take/update attendance for one period (Faculty/Branch/Admin, ownership checked in controller)
router.get(
  "/roster/:timetableEntryId",
  requireRole("FACULTY", "BRANCH", "ADMIN"),
  validate(rosterQuerySchema),
  controller.getRoster
);
router.post(
  "/save",
  requireRole("FACULTY", "BRANCH", "ADMIN"),
  validate(saveAttendanceSchema),
  controller.saveAttendance
);

// Reports — Faculty (own classes), Branch (own department), Admin (all)
router.get(
  "/report",
  requireRole("FACULTY", "BRANCH", "ADMIN"),
  validate(reportQuerySchema),
  controller.getClassReport
);

// Leave requests — review side (Faculty/Branch/Admin)
router.get(
  "/leave/requests",
  requireRole("FACULTY", "BRANCH", "ADMIN"),
  validate(leaveListQuerySchema),
  controller.listLeaveRequests
);
router.put(
  "/leave/:id/review",
  requireRole("FACULTY", "BRANCH", "ADMIN"),
  validate(reviewLeaveSchema),
  controller.reviewLeave
);

export default router;
