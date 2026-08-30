const TASK_TYPES = new Set(["FOLLOW_UP", "PREP", "THANK_YOU", "REMINDER", "OTHER"]);

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function parseDate(value, field) {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${field} must be a valid date.`);
  return date;
}

function validateLength(value, max, field) {
  if (value && value.length > max) throw new Error(`${field} must be ${max} characters or fewer.`);
}

function normalizeTaskBody(body, { partial = false } = {}) {
  const payload = {};

  if (!partial || Object.prototype.hasOwnProperty.call(body, "title")) {
    const title = normalizeOptional(body.title);
    if (!title) throw new Error(partial ? "title cannot be empty." : "title is required.");
    validateLength(title, 255, "title");
    payload.title = title;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "description")) {
    const description = normalizeOptional(body.description);
    validateLength(description, 2000, "description");
    payload.description = description;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "applicationId")) {
    const applicationId = normalizeOptional(body.applicationId);
    validateLength(applicationId, 120, "applicationId");
    payload.applicationId = applicationId;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "dueDate")) {
    payload.dueDate = parseDate(body.dueDate, "dueDate");
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "type")) {
    const type = body.type ?? "OTHER";
    if (!TASK_TYPES.has(type)) throw new Error("type is invalid.");
    payload.type = type;
  }

  if (partial && Object.keys(payload).length === 0) {
    throw new Error("Provide at least one task field to update.");
  }

  return payload;
}

export function validateTaskPayload(req, res, next) {
  try {
    req.validatedTask = normalizeTaskBody(req.body);
    return next();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export function validateTaskPatchPayload(req, res, next) {
  try {
    req.validatedTask = normalizeTaskBody(req.body, { partial: true });
    return next();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export function validateTaskAutomationPreferences(req, res, next) {
  const payload = {};

  function validateDelayDays(field) {
    if (!Object.prototype.hasOwnProperty.call(req.body, field)) return null;
    const value = req.body[field];
    if (!Number.isInteger(value) || value < 0 || value > 365) {
      return `${field} must be a whole number between 0 and 365.`;
    }
    payload[field] = value;
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "autoCreateFollowUpTasks")) {
    if (typeof req.body.autoCreateFollowUpTasks !== "boolean") {
      return res.status(400).json({ message: "autoCreateFollowUpTasks must be a boolean." });
    }
    payload.autoCreateFollowUpTasks = req.body.autoCreateFollowUpTasks;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "autoCreateThankYouTasks")) {
    if (typeof req.body.autoCreateThankYouTasks !== "boolean") {
      return res.status(400).json({ message: "autoCreateThankYouTasks must be a boolean." });
    }
    payload.autoCreateThankYouTasks = req.body.autoCreateThankYouTasks;
  }

  const followUpDelayError = validateDelayDays("followUpTaskDelayDays");
  if (followUpDelayError) return res.status(400).json({ message: followUpDelayError });

  const thankYouDelayError = validateDelayDays("thankYouTaskDelayDays");
  if (thankYouDelayError) return res.status(400).json({ message: thankYouDelayError });

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ message: "Provide at least one preference to update." });
  }

  req.validatedTaskAutomationPreferences = payload;
  return next();
}
