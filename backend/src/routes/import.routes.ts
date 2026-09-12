import { Router } from "express";
import * as controller from "../controllers/import.controller";
import * as ttImportController from "../controllers/timetableImport.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { validate } from "../middleware/validate.middleware";
import { handleUpload } from "../utils/handleUpload";
import { uploadImportFile, uploadTimetableImage } from "../middleware/upload.middleware";
import { confirmTimetableSchema } from "../controllers/timetableImport.controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

router.get("/", controller.listImportBatches);
router.post("/students", handleUpload(uploadImportFile), controller.importStudentsCsv);
router.post("/faculty", handleUpload(uploadImportFile), controller.importFacultyCsv);
router.post("/timetable", handleUpload(uploadImportFile), controller.importTimetableCsv);

// Timetable image (OCR) import flow
router.post("/timetable/image", handleUpload(uploadTimetableImage), ttImportController.uploadTimetableImage);
router.post(
  "/timetable/image/confirm",
  validate(confirmTimetableSchema),
  ttImportController.confirmTimetableImport
);

export default router;
