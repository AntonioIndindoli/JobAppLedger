import crypto from "crypto";
import { getPrismaAsync } from "../db/prisma.js";
import { env } from "../config/env.js";

const SALT_BYTES = 16;
const KEYLEN = 64;
const DIGEST = "sha512";
const ITERATIONS = 120000;
const REFRESH_TOKEN_BYTES = 48;

function hashPassword(password, salt = crypto.randomBytes(SALT_BYTES).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");
  return `${ITERATIONS}:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [iterationsRaw, salt, originalHash] = stored.split(":");
  const iterations = Number(iterationsRaw);
  if (!iterations || !salt || !originalHash) return false;

  const hash = crypto.pbkdf2Sync(password, salt, iterations, KEYLEN, DIGEST).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
}

function signAccessToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + parseAccessTtlSeconds();
  const payload = Buffer.from(JSON.stringify({ sub: user.id, email: user.email, name: user.name ?? null, exp })).toString("base64url");
  const signature = crypto.createHmac("sha256", env.JWT_ACCESS_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function parseAccessTtlSeconds() {
  const ttl = env.ACCESS_TOKEN_TTL;
  const [, valueRaw, unit] = ttl.match(/^(\d+)([smhd])$/) ?? [];
  const value = Number(valueRaw);
  if (!value || !unit) return 15 * 60;
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * multipliers[unit];
}

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
}

async function issueSession(user) {
  const prisma = await getPrismaAsync();
  const refreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
  const expiresAt = buildExpiryDate();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt,
    },
  });

  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
  };
}

export function verifyAccessToken(token) {
  const [header, payload, signature] = String(token || "").split(".");
  if (!header || !payload || !signature) throw new Error("Malformed token");
  const expected = crypto.createHmac("sha256", env.JWT_ACCESS_SECRET).update(`${header}.${payload}`).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Invalid signature");

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) throw new Error("Expired token");
  return parsed;
}

export async function signup({ name, email, password }) {
  const prisma = await getPrismaAsync();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { status: 409, body: { message: "Email already in use." } };
  }

  const user = await prisma.user.create({
    data: { name: name?.trim() || null, email, passwordHash: hashPassword(password) },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const session = await issueSession(user);
  return { status: 201, body: session };
}

export async function login({ email, password }) {
  const prisma = await getPrismaAsync();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { status: 401, body: { message: "Invalid credentials." } };
  }

  const safeUser = { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  const session = await issueSession(safeUser);
  return { status: 200, body: session };
}

export async function refreshSession(rawRefreshToken) {
  if (!rawRefreshToken) return { status: 401, body: { message: "Refresh token missing." } };

  const prisma = await getPrismaAsync();
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(rawRefreshToken) },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
  });

  if (!refreshToken || refreshToken.revokedAt || refreshToken.expiresAt < new Date()) {
    return { status: 401, body: { message: "Invalid refresh token." } };
  }

  await prisma.refreshToken.update({ where: { id: refreshToken.id }, data: { revokedAt: new Date() } });
  const session = await issueSession(refreshToken.user);
  return { status: 200, body: session };
}

export async function revokeSession(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const prisma = await getPrismaAsync();
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(rawRefreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
