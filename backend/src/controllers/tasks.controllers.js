import {
  completeTask,
  createTask,
  deleteTask,
  getTaskAutomationPreferences,
  listTasks,
  updateTask,
  updateTaskAutomationPreferences,
} from "../services/tasks.services.js";

export async function listTasksController(req, res) {
  const tasks = await listTasks(req.auth.sub, req.query);
  return res.status(200).json({ tasks });
}

export async function createTaskController(req, res) {
  const task = await createTask(req.auth.sub, req.validatedTask);
  if (!task) return res.status(404).json({ message: "Application not found." });
  return res.status(201).json({ task });
}

export async function updateTaskController(req, res) {
  const result = await updateTask(req.auth.sub, req.params.id, req.validatedTask);
  if (!result) return res.status(404).json({ message: "Task not found." });
  if (result.missingApplication) return res.status(404).json({ message: "Application not found." });
  return res.status(200).json({ task: result });
}

export async function completeTaskController(req, res) {
  const task = await completeTask(req.auth.sub, req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found." });
  return res.status(200).json({ task });
}

export async function deleteTaskController(req, res) {
  const deleted = await deleteTask(req.auth.sub, req.params.id);
  if (!deleted) return res.status(404).json({ message: "Task not found." });
  return res.status(204).send();
}

export async function getTaskAutomationPreferencesController(req, res) {
  const preferences = await getTaskAutomationPreferences(req.auth.sub);
  return res.status(200).json({ preferences });
}

export async function updateTaskAutomationPreferencesController(req, res) {
  const preferences = await updateTaskAutomationPreferences(req.auth.sub, req.validatedTaskAutomationPreferences);
  return res.status(200).json({ preferences });
}
