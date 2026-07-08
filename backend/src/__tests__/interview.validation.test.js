import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { errorHandler, notFoundHandler } from "../middleware/error.middleware.js";
import {
  validateInterviewPatchPayload,
  validateInterviewPayload,
} from "../validators/interview.validators.js";

async function withServer(app, fn) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function createTestInterviewApp() {
  const app = express();
  app.use(express.json());
  app.post("/interviews", validateInterviewPayload, (req, res) =>
    res.status(201).json({
      ...req.validatedInterview,
      scheduledAt: req.validatedInterview.scheduledAt.toISOString(),
    }),
  );
  app.patch("/interviews/:id", validateInterviewPatchPayload, (req, res) =>
    res.status(200).json({
      ...req.validatedInterviewPatch,
      scheduledAt: req.validatedInterviewPatch.scheduledAt?.toISOString(),
    }),
  );
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

test("interview create validation accepts normalized payload", async () => {
  const app = createTestInterviewApp();
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/interviews`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        applicationId: "app_123",
        type: "TECHNICAL",
        scheduledAt: "2026-08-10T17:30:00.000Z",
        durationMinutes: "45",
        meetingUrl: "https://meet.example.com/interview",
        interviewerName: "Ada Lovelace",
        outcome: "SCHEDULED",
      }),
    });

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.applicationId, "app_123");
    assert.equal(body.type, "TECHNICAL");
    assert.equal(body.durationMinutes, 45);
    assert.equal(body.meetingUrl, "https://meet.example.com/interview");
  });
});

test("interview create validation rejects invalid payloads", async () => {
  const app = createTestInterviewApp();
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/interviews`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        applicationId: "",
        type: "COFFEE_CHAT",
        scheduledAt: "not-a-date",
        durationMinutes: 0,
        meetingUrl: "ftp://example.com/interview",
      }),
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.message, "applicationId is required.");
  });
});

test("interview patch validation accepts partial updates and rejects empty bodies", async () => {
  const app = createTestInterviewApp();
  await withServer(app, async (baseUrl) => {
    const accepted = await fetch(`${baseUrl}/interviews/int_123`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        outcome: "COMPLETED",
        notes: "Strong systems discussion.",
      }),
    });

    assert.equal(accepted.status, 200);
    const acceptedBody = await accepted.json();
    assert.equal(acceptedBody.outcome, "COMPLETED");
    assert.equal(acceptedBody.notes, "Strong systems discussion.");

    const rejected = await fetch(`${baseUrl}/interviews/int_123`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    assert.equal(rejected.status, 400);
    const rejectedBody = await rejected.json();
    assert.equal(rejectedBody.message, "Provide at least one interview field to update.");
  });
});
