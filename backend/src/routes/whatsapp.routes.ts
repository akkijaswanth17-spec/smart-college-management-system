import { Router } from "express";
import * as controller from "../controllers/whatsapp.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createWhatsAppGroupSchema,
  createWhatsAppRequestSchema,
  updateWhatsAppRequestSchema,
} from "../validators/whatsapp.validators";

const router = Router();

router.use(authenticate);

router.get("/groups", controller.listGroups);
router.post("/groups", requireRole("ADMIN"), validate(createWhatsAppGroupSchema), controller.createGroup);

router.post("/requests", requireRole("STUDENT"), validate(createWhatsAppRequestSchema), controller.createRequest);
router.get("/requests/my", requireRole("STUDENT"), controller.myRequests);
router.get("/requests", requireRole("ADMIN"), controller.listRequests);
router.put(
  "/requests/:id",
  requireRole("ADMIN"),
  validate(updateWhatsAppRequestSchema),
  controller.updateRequestStatus
);
router.delete("/requests/:id", requireRole("ADMIN"), controller.deleteRequest);

export default router;
