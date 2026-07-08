import {
  createInterview,
  deleteInterview,
  listInterviews,
  updateInterview,
} from "../services/interviews.services.js";

export async function listInterviewsController(req, res) {
  const interviews = await listInterviews(req.auth.sub, req.query);
  return res.status(200).json({ interviews });
}

export async function createInterviewController(req, res) {
  const result = await createInterview(req.auth.sub, req.validatedInterview);
  if (!result) return res.status(404).json({ message: "Application not found." });
  return res.status(201).json(result);
}

export async function updateInterviewController(req, res) {
  const result = await updateInterview(req.auth.sub, req.params.id, req.validatedInterviewPatch);
  if (!result) return res.status(404).json({ message: "Interview not found." });
  if (result.missingApplication) return res.status(404).json({ message: "Application not found." });
  return res.status(200).json(result);
}

export async function deleteInterviewController(req, res) {
  const deleted = await deleteInterview(req.auth.sub, req.params.id);
  if (!deleted) return res.status(404).json({ message: "Interview not found." });
  return res.status(204).send();
}
