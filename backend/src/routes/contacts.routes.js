import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createContactController,
  deleteContactController,
  getContactController,
  listContactsController,
  updateContactController,
} from "../controllers/contacts.controllers.js";
import { validateContactPatchPayload, validateContactPayload } from "../validators/contact.validators.js";

const router = Router();

router.use(requireAuth);
router.get("/", listContactsController);
router.post("/", validateContactPayload, createContactController);
router.get("/:id", getContactController);
router.patch("/:id", validateContactPatchPayload, updateContactController);
router.delete("/:id", deleteContactController);

export default router;
