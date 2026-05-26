import { login, refreshSession, revokeSession, signup } from "../services/auth.services.js";
import { env } from "../config/env.js";

const REFRESH_COOKIE_NAME = "refresh_token";

function getCookie(req, name) {
  const raw = req.headers.cookie ?? "";
  for (const pair of raw.split(";")) {
    const [k, ...v] = pair.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}


function getCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    path: "/auth",
    expires: expiresAt,
  };
}

function sendSessionResponse(res, result) {
  if (!result?.body?.refreshToken || !result?.body?.refreshTokenExpiresAt) {
    return res.status(result.status).json(result.body);
  }

  const { refreshToken, refreshTokenExpiresAt, ...publicBody } = result.body;
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions(refreshTokenExpiresAt));
  return res.status(result.status).json(publicBody);
}

export async function signupController(req, res) {
  const { name, email, password } = req.body;
  const result = await signup({ name, email, password });
  return sendSessionResponse(res, result);
}

export async function loginController(req, res) {
  const { email, password } = req.body;
  const result = await login({ email, password });
  return sendSessionResponse(res, result);
}

export async function refreshController(req, res) {
  const result = await refreshSession(getCookie(req, REFRESH_COOKIE_NAME));
  return sendSessionResponse(res, result);
}

export async function logoutController(req, res) {
  await revokeSession(getCookie(req, REFRESH_COOKIE_NAME));
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/auth" });
  return res.status(204).send();
}

export function meController(req, res) {
  return res.status(200).json({ user: req.auth });
}
