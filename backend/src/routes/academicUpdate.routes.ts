import { Router } from "express";
import * as controller from "../controllers/academicUpdate.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { validate } from "../middleware/validate.middleware";
import { createAcademicUpdateSchema, updateAcademicUpdateSchema } from "../validators/academicUpdate.validators";
import { handleUpload } from "../utils/handleUpload";
import { uploadAcademicAttachment } from "../middleware/upload.middleware";

const router = Router();

router.use(authenticate);

router.get("/", controller.listAcademicUpdates);
router.get("/:id", controller.getAcademicUpdate);
router.post(
  "/",
  requireRole("ADMIN"),
  handleUpload(uploadAcademicAttachment),
  validate(createAcademicUpdateSchema),
  controller.createAcademicUpdate
);
router.put(
  "/:id",
  requireRole("ADMIN"),
  handleUpload(uploadAcademicAttachment),
  validate(updateAcademicUpdateSchema),
  controller.updateAcademicUpdate
);
router.delete("/:id", requireRole("ADMIN"), controller.deleteAcademicUpdate);

export default router;
