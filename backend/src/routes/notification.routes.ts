import { Router } from "express";
import * as controller from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", controller.listNotifications);
router.put("/:id/read", controller.markNotificationRead);
router.put("/read-all", controller.markAllNotificationsRead);

export default router;
