-- Phase 0 audit: production was checked before this migration and contained no
-- ResumeVersion rows. Fail closed if legacy rows appear before deployment so
-- their files can be migrated deliberately instead of silently discarded.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ResumeVersion") THEN
    RAISE EXCEPTION 'ResumeVersion storage migration requires an empty legacy ResumeVersion table; migrate or remove legacy fileUrl records first.';
  END IF;
END $$;

CREATE TYPE "ResumeUploadStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

ALTER TYPE "ActivityType" ADD VALUE 'RESUME_ATTACHED';
ALTER TYPE "ActivityType" ADD VALUE 'RESUME_CHANGED';
ALTER TYPE "ActivityType" ADD VALUE 'RESUME_REMOVED';

DROP INDEX "ResumeVersion_userId_name_key";

ALTER TABLE "ResumeVersion"
  DROP COLUMN "fileUrl",
  ADD COLUMN "storageKey" TEXT NOT NULL,
  ADD COLUMN "originalFilename" TEXT NOT NULL,
  ADD COLUMN "mimeType" TEXT NOT NULL,
  ADD COLUMN "sizeBytes" INTEGER NOT NULL,
  ADD COLUMN "checksum" TEXT,
  ADD COLUMN "uploadStatus" "ResumeUploadStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "extractedText" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "ResumeVersion_storageKey_key" ON "ResumeVersion"("storageKey");
CREATE UNIQUE INDEX "ResumeVersion_userId_checksum_key" ON "ResumeVersion"("userId", "checksum");
CREATE INDEX "ResumeVersion_userId_archivedAt_idx" ON "ResumeVersion"("userId", "archivedAt");
