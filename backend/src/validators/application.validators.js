const APP_STATUSES = new Set([
  "SAVED",
  "APPLIED",
  "RECRUITER_SCREEN",
  "TECHNICAL_INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
]);

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

export function validateApplicationPayload(req, res, next) {
  try {
    const title = normalizeOptional(req.body.title);
    if (!title) return res.status(400).json({ message: "title is required." });

    const status = req.body.status ?? "SAVED";
    if (!APP_STATUSES.has(status)) return res.status(400).json({ message: "status is invalid." });

    req.validatedApplication = {
      title,
      status,
      companyName: normalizeOptional(req.body.companyName),
      source: normalizeOptional(req.body.source),
      sourceUrl: normalizeOptional(req.body.sourceUrl),
      location: normalizeOptional(req.body.location),
      notes: normalizeOptional(req.body.notes),
      dateApplied: parseDate(req.body.dateApplied, "dateApplied"),
    };

    return next();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export function validateStatusTransition(req, res, next) {
  const status = req.body?.status;
  if (!status || !APP_STATUSES.has(status)) {
    return res.status(400).json({ message: "status is invalid." });
  }
  req.validatedStatusTransition = { status };
  return next();
}
