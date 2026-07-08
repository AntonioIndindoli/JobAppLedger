import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createInterviewController,
  deleteInterviewController,
  listInterviewsController,
  updateInterviewController,
} from "../controllers/interviews.controllers.js";
import { validateInterviewPatchPayload, validateInterviewPayload } from "../validators/interview.validators.js";

const router = Router();

router.use(requireAuth);
router.get("/", listInterviewsController);
router.post("/", validateInterviewPayload, createInterviewController);
router.patch("/:id", validateInterviewPatchPayload, updateInterviewController);
router.delete("/:id", deleteInterviewController);

export default router;
