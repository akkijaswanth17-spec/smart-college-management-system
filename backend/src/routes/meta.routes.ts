import { Router } from "express";
import * as controller from "../controllers/meta.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";

const router = Router();

// Departments are public so the student registration form can populate its dropdown before login.
router.get("/departments", controller.listDepartments);
router.post("/departments", authenticate, requireRole("ADMIN"), controller.createDepartment);

router.get("/subjects", authenticate, controller.listSubjects);
router.post("/subjects", authenticate, requireRole("ADMIN"), controller.createSubject);

router.get("/blocks", authenticate, controller.listBlocks);
router.post("/blocks", authenticate, requireRole("ADMIN"), controller.createBlock);

router.get("/rooms", authenticate, controller.listRooms);
router.post("/rooms", authenticate, requireRole("ADMIN"), controller.createRoom);

export default router;
