import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateApplicationPayload } from "../validators/application.validators.js";
import { createApplicationController, deleteApplicationController, getApplicationController, listApplicationsController, updateApplicationController } from "../controllers/applications.controllers.js";

const router = Router();

router.use(requireAuth);
router.get("/", listApplicationsController);
router.post("/", validateApplicationPayload, createApplicationController);
router.get("/:id", getApplicationController);
router.put("/:id", validateApplicationPayload, updateApplicationController);
router.delete("/:id", deleteApplicationController);

export default router;
