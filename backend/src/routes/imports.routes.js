import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  convertImportDraftController,
  createImportDraftController,
  getImportDraftController,
} from "../controllers/imports.controllers.js";
import { validateConvertDraftPayload, validateCreateDraftPayload } from "../validators/import.validators.js";

const router = Router();

router.use(requireAuth);
router.post("/create-draft", validateCreateDraftPayload, createImportDraftController);
router.get("/:id", getImportDraftController);
router.post("/:id/convert", validateConvertDraftPayload, convertImportDraftController);

export default router;
