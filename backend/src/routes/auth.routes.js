import { Router } from "express";
import { loginController, logoutController, meController, refreshController, signupController } from "../controllers/auth.controllers.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { loginSchema, signupSchema } from "../validators/auth.validators.js";

const router = Router();

router.post("/signup", validateBody(signupSchema), signupController);
router.post("/login", validateBody(loginSchema), loginController);
router.post("/refresh", refreshController);
router.post("/logout", logoutController);
router.get("/me", requireAuth, meController);

export default router;
