import { Router } from "express";
import * as controller from "../controllers/push.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { subscribePushSchema, unsubscribePushSchema } from "../validators/push.validators";

const router = Router();

// Public — the VAPID public key isn't secret, the frontend needs it before login too.
router.get("/vapid-public-key", controller.getVapidPublicKey);

router.use(authenticate);

router.post("/subscribe", validate(subscribePushSchema), controller.subscribe);
router.post("/unsubscribe", validate(unsubscribePushSchema), controller.unsubscribe);

export default router;
