import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { parseJobDescriptionController } from "../controllers/parser.controllers.js";
import { validateParserPayload } from "../validators/import.validators.js";

const router = Router();

router.use(requireAuth);
router.post("/job-description", validateParserPayload, parseJobDescriptionController);

export default router;
