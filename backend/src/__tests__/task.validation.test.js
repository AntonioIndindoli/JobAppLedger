import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { validateTaskAutomationPreferences, validateTaskPatchPayload, validateTaskPayload } from "../validators/task.validators.js";

async function withServer(app, run) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post("/tasks", validateTaskPayload, (req, res) => res.status(200).json(req.validatedTask));
  app.patch("/tasks/preferences", validateTaskAutomationPreferences, (req, res) =>
    res.status(200).json(req.validatedTaskAutomationPreferences),
  );
  app.patch("/tasks/:id", validateTaskPatchPayload, (req, res) => res.status(200).json(req.validatedTask));
  return app;
}

test("task create validation accepts normalized follow-up payload", async () => {
  await withServer(buildApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: " Follow up ",
        description: " Check in ",
        applicationId: "app_123",
        dueDate: "2026-07-16T12:00:00.000Z",
        type: "FOLLOW_UP",
      }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.title, "Follow up");
    assert.equal(body.description, "Check in");
    assert.equal(body.applicationId, "app_123");
    assert.equal(body.type, "FOLLOW_UP");
    assert.equal(body.dueDate, "2026-07-16T12:00:00.000Z");
  });
});

test("task validation rejects invalid payloads", async () => {
  await withServer(buildApp(), async (baseUrl) => {
    const missingTitle = await fetch(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "REMINDER" }),
    });
    assert.equal(missingTitle.status, 400);
    assert.equal((await missingTitle.json()).message, "title is required.");

    const invalidType = await fetch(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Ping recruiter", type: "PING" }),
    });
    assert.equal(invalidType.status, 400);
    assert.equal((await invalidType.json()).message, "type is invalid.");
  });
});

test("task patch and automation preference validation accept partial payloads", async () => {
  await withServer(buildApp(), async (baseUrl) => {
    const taskPatch = await fetch(`${baseUrl}/tasks/task_123`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "THANK_YOU" }),
    });
    assert.equal(taskPatch.status, 200);
    assert.equal((await taskPatch.json()).type, "THANK_YOU");

    const preferences = await fetch(`${baseUrl}/tasks/preferences`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ autoCreateFollowUpTasks: true, autoCreateThankYouTasks: false }),
    });
    assert.equal(preferences.status, 200);
    assert.deepEqual(await preferences.json(), { autoCreateFollowUpTasks: true, autoCreateThankYouTasks: false });
  });
});
