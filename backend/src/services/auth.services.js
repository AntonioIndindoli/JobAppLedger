import crypto from "crypto";
import { getPrismaAsync } from "../db/prisma.js";

const SALT_BYTES = 16;
const KEYLEN = 64;
const DIGEST = "sha512";
const ITERATIONS = 120000;

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

function signToken(user) {
  const payload = JSON.stringify({ sub: user.id, email: user.email, name: user.name ?? null, iat: Date.now() });
  return Buffer.from(payload).toString("base64url");
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

  return { status: 201, body: { user, token: signToken(user) } };
}

export async function login({ email, password }) {
  const prisma = await getPrismaAsync();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { status: 401, body: { message: "Invalid credentials." } };
  }

  const safeUser = { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  return { status: 200, body: { user: safeUser, token: signToken(safeUser) } };
}
