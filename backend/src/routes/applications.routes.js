import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateApplicationPayload, validateStatusTransition } from "../validators/application.validators.js";
import {
  createApplicationController,
  deleteApplicationController,
  getApplicationController,
  getApplicationHistoryController,
  listApplicationsController,
  transitionApplicationStatusController,
  updateApplicationController,
} from "../controllers/applications.controllers.js";

const router = Router();

router.use(requireAuth);
router.get("/", listApplicationsController);
router.post("/", validateApplicationPayload, createApplicationController);
router.get("/:id", getApplicationController);
router.get("/:id/history", getApplicationHistoryController);
router.put("/:id", validateApplicationPayload, updateApplicationController);
router.patch("/:id/status", validateStatusTransition, transitionApplicationStatusController);
router.delete("/:id", deleteApplicationController);

export default router;
