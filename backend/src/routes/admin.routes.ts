import { Router } from "express";
import * as controller from "../controllers/admin.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { validate } from "../middleware/validate.middleware";
import { updateAdminSelfSchema } from "../validators/admin.validators";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

router.get("/dashboard", controller.getDashboardStats);
router.put("/me", validate(updateAdminSelfSchema), controller.updateSelf);

export default router;
