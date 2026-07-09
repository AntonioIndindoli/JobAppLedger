import { getPrismaAsync } from "../db/prisma.js";

const TASK_INCLUDE = {
  application: {
    select: {
      id: true,
      title: true,
      company: { select: { name: true } },
    },
  },
};

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function withApplication(task) {
  return {
    ...task,
    applicationTitle: task.application?.title ?? null,
    companyName: task.application?.company?.name ?? null,
  };
}

function buildTaskWhere(userId, query = {}) {
  const where = { userId };
  if (query.applicationId) where.applicationId = String(query.applicationId);
  if (query.type) where.type = String(query.type);
  if (query.completed === "true") where.completedAt = { not: null };
  if (query.completed === "false") where.completedAt = null;

  if (query.overdue === "true") {
    where.completedAt = null;
    where.dueDate = { lt: new Date() };
  } else if (query.upcoming === "true") {
    where.completedAt = null;
    where.dueDate = { gte: new Date() };
  } else if (query.startDate || query.endDate) {
    where.dueDate = {};
    if (query.startDate) where.dueDate.gte = new Date(String(query.startDate));
    if (query.endDate) where.dueDate.lte = new Date(String(query.endDate));
  }

  return where;
}

async function logTaskActivity(tx, userId, applicationId, type, message, metadata = null) {
  if (!applicationId) return;
  await tx.activityLog.create({ data: { userId, applicationId, type, message, metadata } });
}

export async function listTasks(userId, query = {}) {
  const prisma = await getPrismaAsync();
  const tasks = await prisma.task.findMany({
    where: buildTaskWhere(userId, query),
    include: TASK_INCLUDE,
    orderBy: [{ completedAt: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
  return tasks.map(withApplication);
}

export async function createTask(userId, payload) {
  const prisma = await getPrismaAsync();
  return prisma.$transaction(async (tx) => {
    if (payload.applicationId) {
      const application = await tx.application.findFirst({ where: { id: payload.applicationId, userId }, select: { id: true } });
      if (!application) return null;
    }

    const task = await tx.task.create({ data: { userId, ...payload }, include: TASK_INCLUDE });
    await logTaskActivity(tx, userId, task.applicationId, "TASK_ADDED", `Task added: ${task.title}`, {
      taskId: task.id,
      type: task.type,
      dueDate: task.dueDate,
    });
    return withApplication(task);
  });
}

export async function updateTask(userId, id, payload) {
  const prisma = await getPrismaAsync();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.task.findFirst({ where: { id, userId } });
    if (!existing) return null;

    if (payload.applicationId) {
      const application = await tx.application.findFirst({ where: { id: payload.applicationId, userId }, select: { id: true } });
      if (!application) return { missingApplication: true };
    }

    const updated = await tx.task.update({ where: { id }, data: payload, include: TASK_INCLUDE });
    return withApplication(updated);
  });
}

export async function completeTask(userId, id) {
  const prisma = await getPrismaAsync();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.task.findFirst({ where: { id, userId } });
    if (!existing) return null;

    const completedAt = existing.completedAt ?? new Date();
    const task = await tx.task.update({ where: { id }, data: { completedAt }, include: TASK_INCLUDE });
    if (!existing.completedAt) {
      await logTaskActivity(tx, userId, task.applicationId, "TASK_COMPLETED", `Task completed: ${task.title}`, { taskId: task.id });
    }
    return withApplication(task);
  });
}

export async function deleteTask(userId, id) {
  const prisma = await getPrismaAsync();
  const existing = await prisma.task.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return false;
  await prisma.task.delete({ where: { id } });
  return true;
}

export async function getTaskAutomationPreferences(userId) {
  const prisma = await getPrismaAsync();
  return prisma.user.findUnique({
    where: { id: userId },
    select: { autoCreateFollowUpTasks: true, autoCreateThankYouTasks: true },
  });
}

export async function updateTaskAutomationPreferences(userId, payload) {
  const prisma = await getPrismaAsync();
  return prisma.user.update({
    where: { id: userId },
    data: payload,
    select: { autoCreateFollowUpTasks: true, autoCreateThankYouTasks: true },
  });
}

export async function maybeCreateAppliedFollowUpTask(tx, userId, application) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { autoCreateFollowUpTasks: true } });
  if (!user?.autoCreateFollowUpTasks) return null;

  const dueDate = addDays(application.dateApplied ?? new Date(), 7);
  const task = await tx.task.create({
    data: {
      userId,
      applicationId: application.id,
      title: `Follow up on ${application.title}`,
      description: "Check in on the application if you have not received a response.",
      dueDate,
      type: "FOLLOW_UP",
    },
    include: TASK_INCLUDE,
  });
  await logTaskActivity(tx, userId, application.id, "TASK_ADDED", `Follow-up task added for ${application.title}`, { taskId: task.id });
  return withApplication(task);
}

export async function maybeCreateInterviewThankYouTask(tx, userId, interview) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { autoCreateThankYouTasks: true } });
  if (!user?.autoCreateThankYouTasks) return null;

  const dueDate = addDays(interview.scheduledAt, 1);
  const titleSuffix = interview.interviewerName ? ` to ${interview.interviewerName}` : "";
  const task = await tx.task.create({
    data: {
      userId,
      applicationId: interview.applicationId,
      title: `Send thank-you note${titleSuffix}`,
      description: "Send a concise thank-you note after the interview.",
      dueDate,
      type: "THANK_YOU",
    },
    include: TASK_INCLUDE,
  });
  await logTaskActivity(tx, userId, interview.applicationId, "TASK_ADDED", "Thank-you task added after interview", {
    taskId: task.id,
    interviewId: interview.id,
  });
  return withApplication(task);
}
