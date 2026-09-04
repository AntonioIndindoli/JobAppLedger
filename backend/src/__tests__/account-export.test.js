import test from "node:test";
import assert from "node:assert/strict";

import { ACCOUNT_RESUME_VERSION_SELECT, createApplicationsCsv } from "../services/auth.services.js";

test("account export includes resume metadata but excludes private storage fields", () => {
  assert.deepEqual(Object.keys(ACCOUNT_RESUME_VERSION_SELECT).sort(), [
    "archivedAt",
    "checksum",
    "createdAt",
    "id",
    "mimeType",
    "name",
    "notes",
    "originalFilename",
    "sizeBytes",
    "targetRole",
    "updatedAt",
    "uploadStatus",
  ]);
  assert.equal("storageKey" in ACCOUNT_RESUME_VERSION_SELECT, false);
  assert.equal("extractedText" in ACCOUNT_RESUME_VERSION_SELECT, false);
  assert.equal("fileUrl" in ACCOUNT_RESUME_VERSION_SELECT, false);
});

test("application CSV export escapes commas, quotes, and line breaks", () => {
  const csv = createApplicationsCsv([
    {
      title: 'Engineer, Platform',
      company: { name: 'Example "Labs"' },
      status: "APPLIED",
      notes: "First line\nSecond line",
      createdAt: new Date("2026-07-19T12:00:00.000Z"),
      updatedAt: new Date("2026-07-20T12:00:00.000Z"),
    },
  ]);

  assert.match(csv, /"Engineer, Platform"/);
  assert.match(csv, /"Example ""Labs"""/);
  assert.match(csv, /"First line\nSecond line"/);
  assert.match(csv, /2026-07-19T12:00:00.000Z/);
});
