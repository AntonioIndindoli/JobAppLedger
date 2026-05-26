export function validateBody(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
      const error = new Error("Invalid request payload.");
      error.status = 400;
      error.details = details;
      return next(error);
    }

    req.body = parsed.data;
    return next();
  };
}
