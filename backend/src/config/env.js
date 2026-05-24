// src/config/env.js
import dotenv from "dotenv";
dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

export const env = {
  NODE_ENV: optional("NODE_ENV", "development"),
  PORT: Number(optional("PORT", "4000")),
  DATABASE_URL: required("DATABASE_URL"),
  JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET"),
  ACCESS_TOKEN_TTL: optional("ACCESS_TOKEN_TTL", "15m"),
  REFRESH_TOKEN_TTL_DAYS: Number(optional("REFRESH_TOKEN_TTL_DAYS", "7")),
  CORS_ORIGIN: optional("CORS_ORIGIN", "http://localhost:3000"),
  COOKIE_SECURE: optional("COOKIE_SECURE", "false") === "true",
};
