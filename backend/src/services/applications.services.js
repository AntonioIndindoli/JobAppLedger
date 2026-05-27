import { getPrismaAsync } from "../db/prisma.js";

function normalizeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return String(url).trim().toLowerCase();
  }
}

async function findOrCreateCompany(userId, companyName) {
  if (!companyName) return null;
  const prisma = await getPrismaAsync();
  return prisma.company.upsert({
    where: { userId_name: { userId, name: companyName } },
    create: { userId, name: companyName },
    update: {},
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

  const company = await findOrCreateCompany(userId, payload.companyName);
  const application = await prisma.application.create({
    data: {
      userId,
      companyId: company?.id,
      title: payload.title,
      status: payload.status,
      source: payload.source,
      sourceUrl: payload.sourceUrl,
      location: payload.location,
      notes: payload.notes,
      dateApplied: payload.dateApplied,
    },
    include: { company: { select: { name: true } } },
  });

  return { application: withCompany(application) };
}

export async function updateApplication(userId, id, payload) {
  const prisma = await getPrismaAsync();
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const duplicates = await detectDuplicates(prisma, userId, payload, id);
  if (duplicates.length) return { duplicateCandidates: duplicates.map(withCompany) };

  const company = await findOrCreateCompany(userId, payload.companyName);
  const updated = await prisma.application.update({
    where: { id },
    data: {
      companyId: company?.id ?? null,
      title: payload.title,
      status: payload.status,
      source: payload.source,
      sourceUrl: payload.sourceUrl,
      location: payload.location,
      notes: payload.notes,
      dateApplied: payload.dateApplied,
    },
    include: { company: { select: { name: true } } },
  });

  return { application: withCompany(updated) };
}

export async function deleteApplication(userId, id) {
  const prisma = await getPrismaAsync();
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.application.delete({ where: { id } });
  return true;
}
