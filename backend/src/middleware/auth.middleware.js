import { verifyAccessToken } from "../services/auth.services.js";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing bearer token." });
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token." });
  }
}
