import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { authRateLimiter } from "../middleware/rateLimit.middleware";
import { uploadAvatarImage } from "../middleware/upload.middleware";
import { handleUpload } from "../utils/handleUpload";
import {
  loginSchema,
  changePasswordSchema,
  updateEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validators";

const router = Router();

// Public self-registration is intentionally not exposed — all accounts
// (student and faculty) are created by an Admin. See POST /api/students
// and POST /api/faculty.
router.post("/login", authRateLimiter, validate(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);
router.post("/change-password", authenticate, validate(changePasswordSchema), authController.changePassword);
router.post("/avatar", authenticate, handleUpload(uploadAvatarImage), authController.uploadAvatar);
router.put("/email", authenticate, validate(updateEmailSchema), authController.updateEmail);

router.post("/forgot-password", authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

export default router;
