import test from "node:test";
import assert from "node:assert/strict";

import { createApplicationsCsv } from "../services/auth.services.js";

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
