import { Router } from "express";
import * as controller from "../controllers/studyMaterial.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { resolveBranchScope } from "../middleware/branchScope.middleware";
import { validate } from "../middleware/validate.middleware";
import { handleUpload } from "../utils/handleUpload";
import { uploadStudyMaterial } from "../middleware/upload.middleware";
import { createStudyMaterialSchema } from "../validators/studyMaterial.validators";

const router = Router();

router.use(authenticate, resolveBranchScope);

// Any authenticated role may list — the controller scopes what comes back
// (a Student always gets only their own department's materials).
router.get("/", controller.listStudyMaterials);

router.post(
  "/",
  requireRole("ADMIN", "BRANCH"),
  handleUpload(uploadStudyMaterial),
  validate(createStudyMaterialSchema),
  controller.createStudyMaterial
);

router.delete("/:id", requireRole("ADMIN", "BRANCH"), controller.deleteStudyMaterial);

export default router;
