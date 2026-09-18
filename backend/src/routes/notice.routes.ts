import { Router } from "express";
import * as noticeController from "../controllers/notice.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { resolveBranchScope } from "../middleware/branchScope.middleware";
import { validate } from "../middleware/validate.middleware";
import { createNoticeSchema, updateNoticeSchema } from "../validators/notice.validators";
import { handleUpload } from "../utils/handleUpload";
import { uploadNoticeAttachment } from "../middleware/upload.middleware";

const router = Router();

router.use(authenticate, resolveBranchScope);

router.get("/", noticeController.listNotices);
router.get("/:id", noticeController.getNotice);
router.post(
  "/",
  requireRole("ADMIN", "BRANCH"),
  handleUpload(uploadNoticeAttachment),
  validate(createNoticeSchema),
  noticeController.createNotice
);
router.put(
  "/:id",
  requireRole("ADMIN", "BRANCH"),
  handleUpload(uploadNoticeAttachment),
  validate(updateNoticeSchema),
  noticeController.updateNotice
);
router.delete("/:id", requireRole("ADMIN", "BRANCH"), noticeController.deleteNotice);

export default router;
