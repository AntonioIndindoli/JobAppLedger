-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

UPDATE "User" SET "passwordHash" = '' WHERE "passwordHash" IS NULL;

ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;
