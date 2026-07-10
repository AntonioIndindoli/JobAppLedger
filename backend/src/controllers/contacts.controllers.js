import {
  createContact,
  deleteContact,
  getContact,
  listContacts,
  updateContact,
} from "../services/contacts.services.js";

export async function listContactsController(req, res) {
  const contacts = await listContacts(req.auth.sub, req.query);
  return res.status(200).json({ contacts });
}

export async function getContactController(req, res) {
  const contact = await getContact(req.auth.sub, req.params.id);
  if (!contact) return res.status(404).json({ message: "Contact not found." });
  return res.status(200).json({ contact });
}

export async function createContactController(req, res) {
  const result = await createContact(req.auth.sub, req.validatedContact);
  if (result.missingApplication) return res.status(404).json({ message: "Application not found." });
  if (result.missingCompany) return res.status(404).json({ message: "Company not found." });
  return res.status(201).json(result);
}

export async function updateContactController(req, res) {
  const result = await updateContact(req.auth.sub, req.params.id, req.validatedContactPatch);
  if (!result) return res.status(404).json({ message: "Contact not found." });
  if (result.missingApplication) return res.status(404).json({ message: "Application not found." });
  if (result.missingCompany) return res.status(404).json({ message: "Company not found." });
  return res.status(200).json(result);
}

export async function deleteContactController(req, res) {
  const deleted = await deleteContact(req.auth.sub, req.params.id);
  if (!deleted) return res.status(404).json({ message: "Contact not found." });
  return res.status(204).send();
}
