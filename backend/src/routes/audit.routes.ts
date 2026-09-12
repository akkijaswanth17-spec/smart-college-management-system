import { Router } from "express";
import * as controller from "../controllers/audit.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

router.get("/", controller.listAuditLogs);

export default router;
