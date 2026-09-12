import { Router } from "express";
import * as controller from "../controllers/settings.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { validate } from "../middleware/validate.middleware";
import { updateSettingSchema } from "../validators/settings.validators";

const router = Router();

// Reading these links is public — the landing page links out to them for
// anonymous visitors too. Only changing them requires an authenticated Admin.
router.get("/fee-link", controller.getFeeLink);
router.get("/results-link", controller.getResultsLink);

router.put("/fee-link", authenticate, requireRole("ADMIN"), validate(updateSettingSchema), controller.updateFeeLink);
router.put(
  "/results-link",
  authenticate,
  requireRole("ADMIN"),
  validate(updateSettingSchema),
  controller.updateResultsLink
);

export default router;
