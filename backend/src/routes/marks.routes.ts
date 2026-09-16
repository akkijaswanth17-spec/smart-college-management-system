import { Router } from "express";
import * as controller from "../controllers/marks.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { resolveBranchScope } from "../middleware/branchScope.middleware";
import { validate } from "../middleware/validate.middleware";
import { handleUpload } from "../utils/handleUpload";
import { uploadImportFile } from "../middleware/upload.middleware";
import { getMarksSheetSchema, saveMarksSheetSchema } from "../validators/marks.validators";

const router = Router();

router.use(authenticate, resolveBranchScope);

// A student may only ever see their own marks — derived from the
// authenticated session, never a client-supplied id.
router.get("/me", requireRole("STUDENT"), controller.getMyMarks);

router.use(requireRole("ADMIN", "BRANCH"));
router.get("/", controller.listMarks);
router.get("/sheet", validate(getMarksSheetSchema), controller.getMarksSheet);
router.post("/sheet", validate(saveMarksSheetSchema), controller.saveMarksSheet);
router.delete("/:id", controller.deleteMark);

// Bulk Excel/CSV import stays admin-only for now (it resolves students/subjects
// college-wide with no department check yet) — branch admins use the manual sheet above.
router.post("/import", requireRole("ADMIN"), handleUpload(uploadImportFile), controller.importMarksFile);
router.post("/import-sheet", handleUpload(uploadImportFile), controller.importMarksWideFile);

export default router;
