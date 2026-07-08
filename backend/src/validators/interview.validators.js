const INTERVIEW_TYPES = new Set([
  "RECRUITER_SCREEN",
  "TECHNICAL",
  "MANAGER",
  "PANEL",
  "FINAL",
  "TAKE_HOME",
  "OTHER",
]);

const INTERVIEW_OUTCOMES = new Set([
  "SCHEDULED",
  "COMPLETED",
  "PASSED",
  "FAILED",
  "CANCELED",
]);

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function parseRequiredDate(value, field) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${field} is required.`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${field} must be a valid date.`);
  return date;
}

function parseOptionalDate(value, field) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${field} must be a valid date.`);
  return date;
}

function parseOptionalInt(value, field) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${field} must be an integer.`);
  if (parsed < 1 || parsed > 1440) throw new Error(`${field} is outside the allowed range.`);
  return parsed;
}

function validateUrl(value, field) {
  if (!value) return value;

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    return parsed.toString();
  } catch {
    throw new Error(`${field} must be a valid http or https URL.`);
  }
}

function validateLength(value, max, field) {
  if (value && value.length > max) throw new Error(`${field} must be ${max} characters or less.`);
}

function normalizeRequiredEnum(value, allowedValues, field) {
  const normalized = normalizeOptional(value);
  if (!normalized) throw new Error(`${field} is required.`);
  if (!allowedValues.has(normalized)) throw new Error(`${field} is invalid.`);
  return normalized;
}

function normalizeOptionalEnum(value, allowedValues, field) {
  if (value === undefined) return undefined;

  const normalized = normalizeOptional(value);
  if (!normalized) return null;
  if (!allowedValues.has(normalized)) throw new Error(`${field} is invalid.`);
  return normalized;
}

function normalizeCreatePayload(body = {}) {
  const applicationId = normalizeOptional(body.applicationId);
  if (!applicationId) throw new Error("applicationId is required.");

  const type = normalizeRequiredEnum(body.type, INTERVIEW_TYPES, "type");
  const scheduledAt = parseRequiredDate(body.scheduledAt, "scheduledAt");
  const durationMinutes = parseOptionalInt(body.durationMinutes, "durationMinutes");
  const location = normalizeOptional(body.location);
  const meetingUrl = validateUrl(normalizeOptional(body.meetingUrl), "meetingUrl");
  const interviewerName = normalizeOptional(body.interviewerName);
  const notes = normalizeOptional(body.notes);
  const outcome = body.outcome === undefined || body.outcome === null || body.outcome === ""
    ? "SCHEDULED"
    : normalizeRequiredEnum(body.outcome, INTERVIEW_OUTCOMES, "outcome");

  validateLength(applicationId, 120, "applicationId");
  validateLength(location, 500, "location");
  validateLength(meetingUrl, 2000, "meetingUrl");
  validateLength(interviewerName, 255, "interviewerName");
  validateLength(notes, 10000, "notes");

  return {
    applicationId,
    type,
    scheduledAt,
    durationMinutes,
    location,
    meetingUrl,
    interviewerName,
    notes,
    outcome,
  };
}

function normalizePatchPayload(body = {}) {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(body, "applicationId")) {
    const applicationId = normalizeOptional(body.applicationId);
    if (!applicationId) throw new Error("applicationId cannot be empty.");
    validateLength(applicationId, 120, "applicationId");
    payload.applicationId = applicationId;
  }

  const type = normalizeOptionalEnum(body.type, INTERVIEW_TYPES, "type");
  if (type !== undefined) {
    if (type === null) throw new Error("type cannot be empty.");
    payload.type = type;
  }

  const scheduledAt = parseOptionalDate(body.scheduledAt, "scheduledAt");
  if (scheduledAt !== undefined) {
    if (scheduledAt === null) throw new Error("scheduledAt cannot be empty.");
    payload.scheduledAt = scheduledAt;
  }

  const durationMinutes = parseOptionalInt(body.durationMinutes, "durationMinutes");
  if (durationMinutes !== undefined) payload.durationMinutes = durationMinutes;

  if (Object.prototype.hasOwnProperty.call(body, "location")) {
    const location = normalizeOptional(body.location);
    validateLength(location, 500, "location");
    payload.location = location;
  }

  if (Object.prototype.hasOwnProperty.call(body, "meetingUrl")) {
    const meetingUrl = validateUrl(normalizeOptional(body.meetingUrl), "meetingUrl");
    validateLength(meetingUrl, 2000, "meetingUrl");
    payload.meetingUrl = meetingUrl;
  }

  if (Object.prototype.hasOwnProperty.call(body, "interviewerName")) {
    const interviewerName = normalizeOptional(body.interviewerName);
    validateLength(interviewerName, 255, "interviewerName");
    payload.interviewerName = interviewerName;
  }

  if (Object.prototype.hasOwnProperty.call(body, "notes")) {
    const notes = normalizeOptional(body.notes);
    validateLength(notes, 10000, "notes");
    payload.notes = notes;
  }

  const outcome = normalizeOptionalEnum(body.outcome, INTERVIEW_OUTCOMES, "outcome");
  if (outcome !== undefined) {
    if (outcome === null) throw new Error("outcome cannot be empty.");
    payload.outcome = outcome;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("Provide at least one interview field to update.");
  }

  return payload;
}

export function validateInterviewPayload(req, res, next) {
  try {
    req.validatedInterview = normalizeCreatePayload(req.body);
    return next();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export function validateInterviewPatchPayload(req, res, next) {
  try {
    req.validatedInterviewPatch = normalizePatchPayload(req.body);
    return next();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}
