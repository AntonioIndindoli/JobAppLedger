import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  completeTaskController,
  createTaskController,
  deleteTaskController,
  getTaskAutomationPreferencesController,
  listTasksController,
  updateTaskAutomationPreferencesController,
  updateTaskController,
} from "../controllers/tasks.controllers.js";
import {
  validateTaskAutomationPreferences,
  validateTaskPatchPayload,
  validateTaskPayload,
} from "../validators/task.validators.js";

const router = Router();

router.use(requireAuth);
router.get("/", listTasksController);
router.post("/", validateTaskPayload, createTaskController);
router.get("/preferences", getTaskAutomationPreferencesController);
router.patch("/preferences", validateTaskAutomationPreferences, updateTaskAutomationPreferencesController);
router.patch("/:id", validateTaskPatchPayload, updateTaskController);
router.patch("/:id/complete", completeTaskController);
router.delete("/:id", deleteTaskController);

export default router;
