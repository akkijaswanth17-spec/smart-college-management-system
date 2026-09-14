import { Router } from "express";
import * as controller from "../controllers/promotion.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { resolveBranchScope } from "../middleware/branchScope.middleware";
import { validate } from "../middleware/validate.middleware";
import { getPromotionSheetSchema, promoteStudentsSchema } from "../validators/promotion.validators";

const router = Router();

router.use(authenticate, resolveBranchScope, requireRole("ADMIN", "BRANCH"));

router.get("/sheet", validate(getPromotionSheetSchema), controller.getPromotionSheet);
router.post("/promote", validate(promoteStudentsSchema), controller.promoteStudents);

export default router;
