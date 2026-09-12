import { Router } from "express";
import * as controller from "../controllers/lostFound.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { createLostFoundSchema, updateLostFoundSchema } from "../validators/lostFound.validators";
import { handleUpload } from "../utils/handleUpload";
import { uploadLostFoundImage } from "../middleware/upload.middleware";

const router = Router();

// Lost & Found is public — anyone on campus (not just logged-in students/faculty)
// can lose or find something, so browsing the board needs no account.
router.get("/", controller.listLostFound);
router.get("/:id", controller.getLostFound);

// Reporting or moderating an item still requires an account, for accountability.
router.use(authenticate);

router.post("/", handleUpload(uploadLostFoundImage), validate(createLostFoundSchema), controller.createLostFound);
router.put("/:id", handleUpload(uploadLostFoundImage), validate(updateLostFoundSchema), controller.updateLostFound);
router.delete("/:id", controller.deleteLostFound);

export default router;
