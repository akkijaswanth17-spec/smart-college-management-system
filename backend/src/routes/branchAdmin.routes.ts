import { Router } from "express";
import * as controller from "../controllers/branchAdmin.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createBranchAdminSchema,
  updateBranchAdminSchema,
  resetBranchAdminPasswordSchema,
} from "../validators/branchAdmin.validators";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

router.get("/", controller.listBranchAdmins);
router.get("/:id", controller.getBranchAdmin);
router.post("/", validate(createBranchAdminSchema), controller.createBranchAdmin);
router.put("/:id", validate(updateBranchAdminSchema), controller.updateBranchAdmin);
router.delete("/:id", controller.deleteBranchAdmin);
router.patch("/:id/status", controller.setBranchAdminActive);
router.post("/:id/reset-password", validate(resetBranchAdminPasswordSchema), controller.resetBranchAdminPassword);

export default router;
