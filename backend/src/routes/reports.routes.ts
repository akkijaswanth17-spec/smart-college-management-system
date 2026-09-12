import { Router } from "express";
import * as controller from "../controllers/reports.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { resolveBranchScope } from "../middleware/branchScope.middleware";
import { validate } from "../middleware/validate.middleware";
import { studentReportParamsSchema, facultyReportParamsSchema } from "../validators/reports.validators";

const router = Router();

// Reports contain sensitive student/faculty data — ADMIN and BRANCH only, never
// FACULTY or STUDENT, enforced here regardless of what the frontend shows or hides.
router.use(authenticate, resolveBranchScope, requireRole("ADMIN", "BRANCH"));

router.get("/student/:studentId", validate(studentReportParamsSchema), controller.getStudentDetailsReport);
router.get("/student/:studentId/marks", validate(studentReportParamsSchema), controller.getStudentMarksReport);
router.get("/faculty/:facultyId", validate(facultyReportParamsSchema), controller.getFacultyDetailsReport);

export default router;
