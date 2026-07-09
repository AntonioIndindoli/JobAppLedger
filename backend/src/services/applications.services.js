import { getPrismaAsync } from "../db/prisma.js";
import { normalizeUrl } from "../utils/url.js";
import { maybeCreateAppliedFollowUpTask } from "./tasks.services.js";

async function logActivity(prisma, userId, applicationId, type, message, metadata = null) {
  await prisma.activityLog.create({
    data: { userId, applicationId, type, message, metadata },
  });
}

function buildFilters(query) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.source) where.source = { equals: query.source, mode: "insensitive" };
  if (query.company) where.company = { name: { contains: query.company, mode: "insensitive" } };

  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = new Date(query.startDate);
    if (query.endDate) where.createdAt.lte = new Date(query.endDate);
  }

  return where;
}

function withCompany(application) {
  return { ...application, companyName: application.company?.name ?? null };
}

export async function listApplications(userId, query) {
  const prisma = await getPrismaAsync();
  const items = await prisma.application.findMany({
    where: { userId, ...buildFilters(query) },
    include: { company: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return items.map(withCompany);
}

export async function getApplication(userId, id) {
  const prisma = await getPrismaAsync();
  const item = await prisma.application.findFirst({ where: { id, userId }, include: { company: { select: { name: true } } } });
  return item ? withCompany(item) : null;
}

export async function getApplicationHistory(userId, id) {
  const prisma = await getPrismaAsync();
  const app = await prisma.application.findFirst({ where: { id, userId }, select: { id: true } });
  if (!app) return null;
  return prisma.activityLog.findMany({ where: { userId, applicationId: id }, orderBy: { createdAt: "desc" } });
}

export async function listApplicationHistories(userId) {
  const prisma = await getPrismaAsync();
  const logs = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: [{ applicationId: "asc" }, { createdAt: "desc" }],
  });

  return logs.reduce((historyByApp, entry) => {
    if (!historyByApp[entry.applicationId]) historyByApp[entry.applicationId] = [];
    historyByApp[entry.applicationId].push(entry);
    return historyByApp;
  }, {});
}

async function detectDuplicates(prisma, userId, payload, excludeId) {
  const normalizedUrl = normalizeUrl(payload.sourceUrl);
  const where = [{ userId }];
  if (excludeId) where.push({ id: { not: excludeId } });

  const candidates = await prisma.application.findMany({
    where: { AND: where },
    include: { company: { select: { name: true } } },
  });

  return candidates.filter((app) => {
    const byUrl = normalizedUrl && normalizeUrl(app.sourceUrl) === normalizedUrl;
    const byCompanyTitle =
      payload.companyName &&
      app.company?.name &&
      app.title &&
      app.company.name.trim().toLowerCase() === payload.companyName.trim().toLowerCase() &&
      app.title.trim().toLowerCase() === payload.title.trim().toLowerCase();
    return Boolean(byUrl || byCompanyTitle);
  });
}

export async function createApplication(userId, payload) {
  const prisma = await getPrismaAsync();
  const duplicates = await detectDuplicates(prisma, userId, payload);
  if (duplicates.length) return { duplicateCandidates: duplicates.map(withCompany) };

  return prisma.$transaction(async (tx) => {
    const company = payload.companyName
      ? await tx.company.upsert({
          where: { userId_name: { userId, name: payload.companyName } },
          create: { userId, name: payload.companyName },
          update: {},
        })
      : null;
    const application = await tx.application.create({
      data: {
        userId,
        companyId: company?.id,
        title: payload.title,
        status: payload.status,
        source: payload.source,
        sourceUrl: normalizeUrl(payload.sourceUrl),
        location: payload.location,
        salaryMin: payload.salaryMin,
        salaryMax: payload.salaryMax,
        description: payload.description,
        notes: payload.notes,
        dateApplied: payload.dateApplied,
      },
      include: { company: { select: { name: true } } },
    });

    await logActivity(tx, userId, application.id, "APPLICATION_CREATED", `Application created for ${application.title}`, {
      title: application.title,
      status: application.status,
    });

    const createdTasks = [];
    if (application.status === "APPLIED") {
      const task = await maybeCreateAppliedFollowUpTask(tx, userId, application);
      if (task) createdTasks.push(task);
    }

    return { application: withCompany(application), createdTasks };
  });
}

export async function updateApplication(userId, id, payload) {
  const prisma = await getPrismaAsync();
  const existing = await prisma.application.findFirst({ where: { id, userId }, include: { company: { select: { name: true } } } });
  if (!existing) return null;

  const duplicates = await detectDuplicates(prisma, userId, payload, id);
  if (duplicates.length) return { duplicateCandidates: duplicates.map(withCompany) };

  return prisma.$transaction(async (tx) => {
    const company = payload.companyName
      ? await tx.company.upsert({
          where: { userId_name: { userId, name: payload.companyName } },
          create: { userId, name: payload.companyName },
          update: {},
        })
      : null;
    const updated = await tx.application.update({
      where: { id },
      data: {
        companyId: company?.id ?? null,
        title: payload.title,
        status: payload.status,
        source: payload.source,
        sourceUrl: normalizeUrl(payload.sourceUrl),
        location: payload.location,
        salaryMin: payload.salaryMin,
        salaryMax: payload.salaryMax,
        description: payload.description,
        notes: payload.notes,
        dateApplied: payload.dateApplied ?? (payload.status === "APPLIED" && !existing.dateApplied ? new Date() : existing.dateApplied),
      },
      include: { company: { select: { name: true } } },
    });

    await logActivity(tx, userId, id, "APPLICATION_UPDATED", `Application updated: ${updated.title}`, {
      previous: { title: existing.title, status: existing.status, companyName: existing.company?.name ?? null },
      next: { title: updated.title, status: updated.status, companyName: updated.company?.name ?? null },
    });

    const createdTasks = [];
    if (existing.status !== updated.status) {
      await logActivity(tx, userId, id, "STATUS_CHANGED", `Status changed from ${existing.status} to ${updated.status}`, {
        from: existing.status,
        to: updated.status,
      });
      if (updated.status === "APPLIED") {
        const task = await maybeCreateAppliedFollowUpTask(tx, userId, updated);
        if (task) createdTasks.push(task);
      }
    }

    return { application: withCompany(updated), createdTasks };
  });
}

export async function transitionApplicationStatus(userId, id, status) {
  const prisma = await getPrismaAsync();
  const existing = await prisma.application.findFirst({ where: { id, userId }, include: { company: { select: { name: true } } } });
  if (!existing) return null;

  if (existing.status === status) return { application: withCompany(existing) };

  return prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id },
      data: { status, dateApplied: status === "APPLIED" && !existing.dateApplied ? new Date() : existing.dateApplied },
      include: { company: { select: { name: true } } },
    });
    await logActivity(tx, userId, id, "STATUS_CHANGED", `Status changed from ${existing.status} to ${status}`, {
      from: existing.status,
      to: status,
    });

    const createdTasks = [];
    if (status === "APPLIED") {
      const task = await maybeCreateAppliedFollowUpTask(tx, userId, updated);
      if (task) createdTasks.push(task);
    }

    return { application: withCompany(updated), createdTasks };
  });
}

export async function deleteApplication(userId, id) {
  const prisma = await getPrismaAsync();
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.application.delete({ where: { id } });
  return true;
}
