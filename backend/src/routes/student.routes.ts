import { Router } from "express";
import * as studentController from "../controllers/student.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { resolveBranchScope } from "../middleware/branchScope.middleware";
import { validate } from "../middleware/validate.middleware";
import { createStudentSchema, updateStudentSchema } from "../validators/student.validators";

const router = Router();

router.use(authenticate, resolveBranchScope);

router.post("/", requireRole("ADMIN", "BRANCH"), validate(createStudentSchema), studentController.createStudent);
router.get("/", requireRole("ADMIN", "FACULTY", "BRANCH"), studentController.listStudents);
router.get("/:id", requireRole("ADMIN", "FACULTY", "STUDENT", "BRANCH"), studentController.getStudent);
router.put("/:id", requireRole("ADMIN", "STUDENT", "BRANCH"), validate(updateStudentSchema), studentController.updateStudent);
router.delete("/:id", requireRole("ADMIN", "BRANCH"), studentController.deleteStudent);
router.patch("/:id/status", requireRole("ADMIN", "BRANCH"), studentController.setStudentActive);

export default router;
