import { Router } from "express";
import * as controller from "../controllers/timetable.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { resolveBranchScope } from "../middleware/branchScope.middleware";
import { validate } from "../middleware/validate.middleware";
import { createTimetableEntrySchema, updateTimetableEntrySchema } from "../validators/timetable.validators";

const router = Router();

router.use(authenticate, resolveBranchScope);

router.get("/", controller.listTimetable);
router.get("/my", requireRole("FACULTY"), controller.myTimetable);
router.post("/", requireRole("ADMIN", "BRANCH"), validate(createTimetableEntrySchema), controller.createTimetableEntry);
router.put("/:id", requireRole("ADMIN", "BRANCH"), validate(updateTimetableEntrySchema), controller.updateTimetableEntry);
router.delete("/:id", requireRole("ADMIN", "BRANCH"), controller.deleteTimetableEntry);

export default router;
