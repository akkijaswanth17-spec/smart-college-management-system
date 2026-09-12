import { Router } from "express";
import * as facultyController from "../controllers/faculty.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { resolveBranchScope } from "../middleware/branchScope.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createFacultySchema,
  updateFacultySchema,
  resetFacultyPasswordSchema,
} from "../validators/faculty.validators";

const router = Router();

router.use(authenticate, resolveBranchScope);

router.get("/", requireRole("ADMIN", "BRANCH"), facultyController.listFaculty);
router.get("/:id", requireRole("ADMIN", "FACULTY", "BRANCH"), facultyController.getFaculty);
router.post("/", requireRole("ADMIN", "BRANCH"), validate(createFacultySchema), facultyController.createFaculty);
router.put("/:id", requireRole("ADMIN", "BRANCH"), validate(updateFacultySchema), facultyController.updateFaculty);
router.delete("/:id", requireRole("ADMIN", "BRANCH"), facultyController.deleteFaculty);
router.patch("/:id/status", requireRole("ADMIN", "BRANCH"), facultyController.setFacultyActive);
router.post(
  "/:id/reset-password",
  requireRole("ADMIN", "BRANCH"),
  validate(resetFacultyPasswordSchema),
  facultyController.resetFacultyPassword
);

export default router;
