import assert from "node:assert/strict";
import test from "node:test";

import {
  maybeCreateAppliedFollowUpTask,
  maybeCreateInterviewThankYouTask,
} from "../services/tasks.services.js";

function buildTransaction(userPreferences) {
  const createdTasks = [];

  return {
    createdTasks,
    user: {
      findUnique: async () => userPreferences,
    },
    task: {
      create: async ({ data }) => {
        const task = { id: `task-${createdTasks.length + 1}`, ...data, application: null };
        createdTasks.push(task);
        return task;
      },
    },
    activityLog: {
      create: async () => ({}),
    },
  };
}

test("follow-up automation uses the configured delay", async () => {
  const tx = buildTransaction({
    autoCreateFollowUpTasks: true,
    followUpTaskDelayDays: 12,
  });

  await maybeCreateAppliedFollowUpTask(tx, "user-1", {
    id: "application-1",
    title: "Product Designer",
    dateApplied: new Date("2026-08-01T10:00:00.000Z"),
  });

  assert.equal(tx.createdTasks.length, 1);
  assert.equal(tx.createdTasks[0].dueDate.toISOString(), "2026-08-13T10:00:00.000Z");
});

test("thank-you automation supports a same-day delay", async () => {
  const tx = buildTransaction({
    autoCreateThankYouTasks: true,
    thankYouTaskDelayDays: 0,
  });

  await maybeCreateInterviewThankYouTask(tx, "user-1", {
    id: "interview-1",
    applicationId: "application-1",
    scheduledAt: new Date("2026-08-20T16:30:00.000Z"),
    interviewerName: "Jordan",
  });

  assert.equal(tx.createdTasks.length, 1);
  assert.equal(tx.createdTasks[0].dueDate.toISOString(), "2026-08-20T16:30:00.000Z");
});
