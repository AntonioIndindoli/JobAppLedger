import { login, signup } from "../services/auth.services.js";

function normalizeEmail(value = "") {
  return value.trim().toLowerCase();
}

export async function signupController(req, res) {
  const { name, email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  const result = await signup({ name, email: normalizeEmail(email), password: String(password) });
  return res.status(result.status).json(result.body);
}

export async function loginController(req, res) {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const result = await login({ email: normalizeEmail(email), password: String(password) });
  return res.status(result.status).json(result.body);
}
