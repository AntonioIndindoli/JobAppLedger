import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SALT_BYTES = 16;
const KEYLEN = 64;
const DIGEST = "sha512";
const ITERATIONS = 120000;

function hashPassword(password, salt = crypto.randomBytes(SALT_BYTES).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");
  return `${ITERATIONS}:${salt}:${hash}`;
}

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? "demo@jobappledger.local";
  const password = process.env.SEED_USER_PASSWORD ?? "DemoPass123!";
  const name = process.env.SEED_USER_NAME ?? "Demo User";

  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash: hashPassword(password) },
    create: { email, name, passwordHash: hashPassword(password) },
  });

  console.log(`Seeded user: ${email}`);
}

main().finally(async () => prisma.$disconnect());
