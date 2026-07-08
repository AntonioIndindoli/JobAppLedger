import axios from "axios";
import dns from "node:dns/promises";
import net from "node:net";
import { getDomainFromUrl, normalizeUrl } from "../utils/url.js";

const JOB_SOURCES = [
  { name: "LinkedIn", patterns: ["linkedin.com"] },
  { name: "Indeed", patterns: ["indeed.com"] },
  { name: "Greenhouse", patterns: ["greenhouse.io", "boards.greenhouse.io"] },
  { name: "Lever", patterns: ["lever.co", "jobs.lever.co"] },
  { name: "Workday", patterns: ["myworkdayjobs.com", "myworkdaysite.com", "workdayjobs.com"] },
  { name: "Ashby", patterns: ["ashbyhq.com"] },
  { name: "Wellfound", patterns: ["wellfound.com"] },
];

const ROLE_KEYWORDS = [
  "engineer",
  "developer",
  "designer",
  "manager",
  "analyst",
  "specialist",
  "architect",
  "consultant",
  "scientist",
  "recruiter",
  "product",
  "program",
  "data",
  "software",
  "frontend",
  "front end",
  "backend",
  "back end",
  "full stack",
  "sales",
  "marketing",
  "operations",
  "coordinator",
  "director",
  "administrator",
  "business",
  "customer",
  "devops",
  "finance",
  "legal",
  "machine learning",
  "qa",
  "quality",
  "security",
  "support",
  "ux",
  "ui",
];

const SECTION_HEADERS = new Set([
  "about us",
  "about the role",
  "benefits",
  "company",
  "compensation",
  "department",
  "employment type",
  "how to apply",
  "job description",
  "job details",
  "job overview",
  "location",
  "overview",
  "preferred qualifications",
  "qualifications",
  "requirements",
  "required qualifications",
  "responsibilities",
  "salary",
  "skills",
  "tech stack",
  "technology",
  "what you'll do",
  "what you will do",
  "who you are",
]);

const SOURCE_NAMES = new Set(JOB_SOURCES.map((source) => source.name.toLowerCase()));
const COMPANY_SUFFIX_PATTERN = /\b(careers|jobs|hiring|inc\.?|llc|ltd\.?|corp\.?|corporation)\b/gi;
const SKILL_PATTERNS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "Python",
  "Django",
  "Flask",
  "Java",
  "Spring",
  "Go",
  "Ruby",
  "Rails",
  "GraphQL",
  "REST",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "Prisma",
  "Tailwind CSS",
  "CI/CD",
  "React Native",
  "Vue",
  "Angular",
  "Svelte",
  "HTML",
  "CSS",
  "Sass",
  "FastAPI",
  "Laravel",
  "PHP",
  "C#",
  "C++",
  ".NET",
  "Rust",
  "Kotlin",
  "Swift",
  "Scala",
  "Snowflake",
  "BigQuery",
  "Databricks",
  "Spark",
  "Kafka",
  "RabbitMQ",
  "Elasticsearch",
  "OpenSearch",
  "Linux",
  "Bash",
  "Git",
  "GitHub Actions",
  "Jenkins",
  "CircleCI",
  "TensorFlow",
  "PyTorch",
  "Pandas",
  "NumPy",
  "Tableau",
  "Power BI",
  "Figma",
  "Salesforce",
];

const MAX_FETCH_BYTES = 1_000_000;
const FETCH_TIMEOUT_MS = 10000;
const TITLE_SEPARATOR_PATTERN = /\s+(?:[-|]|\u2013|\u2014|\u00b7)\s+/;
const TITLE_LABEL_PATTERN = /^(?:job\s+title|title|role|position)\s*[:\-]\s*(.+)$/i;
const COMPANY_LABEL_PATTERN = /^(?:company|organization|hiring\s+organization|employer)\s*[:\-]\s*(.+)$/i;
const LOCATION_LABEL_PATTERN = /^(?:locations?|job\s+location|work\s+location|based\s+in|office|offices|workplace\s+type)\s*[:\-]?\s*(.+)$/i;

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function titleCaseSlug(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function isKnownSourceName(value) {
  return SOURCE_NAMES.has(String(value ?? "").trim().toLowerCase());
}

function hasRoleKeyword(value) {
  const lower = String(value ?? "").toLowerCase();
  return ROLE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function cleanCandidate(value) {
  const cleaned = normalizeOptional(value)
    ?.replace(/\s+/g, " ")
    .replace(/^[|:,\-\u2013\u2014]+|[|:,\-\u2013\u2014]+$/g, "")
    .trim();
  return cleaned || null;
}

function cleanCompanyName(value) {
  const cleaned = cleanCandidate(value)
    ?.replace(COMPANY_LABEL_PATTERN, "$1")
    .replace(COMPANY_SUFFIX_PATTERN, "")
    .replace(/^at\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/\s*[.,]+$/g, "")
    .trim();
  if (!cleaned || isKnownSourceName(cleaned) || cleaned.length > 80) return null;
  return cleaned;
}

function isRejectedTitle(value) {
  const candidate = cleanCandidate(value);
  if (!candidate) return true;
  const words = candidate.split(/\s+/).length;
  if (candidate.length > 120 || candidate.length < 3) return true;
  if (SECTION_HEADERS.has(candidate.toLowerCase())) return true;
  if (isKnownSourceName(candidate)) return true;
  if (/^(company|organization|employer|department|team|location|salary|compensation)\s*[:\-]/i.test(candidate)) return true;
  if (/^(apply|save|sign in|log in|share|view job|job details)$/i.test(candidate)) return true;
  if (words > 16) return true;
  if (words > 8 && /[.!?]$/.test(candidate)) return true;
  if (words > 7 && /^(we|you|this role|the role|join us|build|work with)\b/i.test(candidate)) return true;
  return false;
}

function getMeaningfulLines(rawText, limit = 16) {
  return String(rawText ?? "")
    .split("\n")
    .map(cleanCandidate)
    .filter(Boolean)
    .filter((line) => !/^(apply now|share this job|sign in|cookie policy)$/i.test(line))
    .slice(0, limit);
}

function truncate(value, max = 1200) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function arrayify(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function splitTitleParts(value) {
  return cleanCandidate(value)?.split(TITLE_SEPARATOR_PATTERN).map(cleanCandidate).filter(Boolean) ?? [];
}

function normalizeFetchUrl(url) {
  if (!url) return null;
  const parsed = new URL(String(url).trim());
  parsed.hash = "";
  return parsed.toString();
}

function isPrivateIp(address) {
  if (!address) return true;
  if (address === "::1" || address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) return true;

  if (net.isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  return false;
}

async function validateFetchUrl(sourceUrl) {
  const parsed = new URL(sourceUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs can be fetched.");
  }

  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || isPrivateIp(host)) {
    throw new Error("Local and private network URLs cannot be fetched.");
  }

  const addresses = await dns.lookup(host, { all: true });
  if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("URL resolved to a private or unavailable address.");
  }
}

function decodeHtmlEntities(value) {
  const decodeCodePoint = (raw, radix) => {
    const codePoint = Number.parseInt(raw, radix);
    if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return null;
    return String.fromCodePoint(codePoint);
  };

  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#x([0-9a-f]+);/gi, (match, code) => decodeCodePoint(code, 16) ?? match)
    .replace(/&#(\d+);/g, (match, code) => decodeCodePoint(code, 10) ?? match);
}

function stripHtmlToText(html) {
  return decodeHtmlEntities(
    String(html ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
      .replace(/<\/(h[1-6]|p|div|section|article|li|ul|ol|br|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function extractHtmlTitle(html) {
  const match = String(html ?? "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanCandidate(decodeHtmlEntities(match?.[1] ?? ""));
}

function parseTagAttributes(tag) {
  const attrs = {};
  for (const match of String(tag ?? "").matchAll(/([:@\w-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) {
    attrs[match[1].toLowerCase()] = decodeHtmlEntities(match[3]);
  }
  return attrs;
}

function extractMetaContent(html, keys) {
  const wantedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const match of String(html ?? "").matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseTagAttributes(match[0]);
    const key = attrs.property || attrs.name || attrs.itemprop;
    if (key && wantedKeys.has(key.toLowerCase()) && attrs.content) return cleanCandidate(attrs.content);
  }
  return null;
}

function extractHtmlMetadata(html) {
  return {
    title:
      extractMetaContent(html, ["og:title", "twitter:title", "title"]) ??
      extractHtmlTitle(html),
    description: extractMetaContent(html, ["og:description", "twitter:description", "description"]),
  };
}

function flattenJsonLd(value) {
  const items = [];
  const visit = (item) => {
    if (!item) return;
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (typeof item !== "object") return;
    items.push(item);
    if (item["@graph"]) visit(item["@graph"]);
    if (item.mainEntity) visit(item.mainEntity);
  };
  visit(value);
  return items;
}

function hasJsonLdType(item, type) {
  return arrayify(item?.["@type"]).some((candidate) => String(candidate).toLowerCase() === type.toLowerCase());
}

function looksLikeJobPosting(item) {
  if (!item || typeof item !== "object") return false;
  if (hasJsonLdType(item, "JobPosting")) return true;
  return Boolean(item.title && item.description && (item.hiringOrganization || item.jobLocation || item.baseSalary));
}

function resolveGraphReference(value, graphNodes) {
  if (!value || typeof value !== "object" || !value["@id"]) return value;
  return graphNodes.find((node) => node !== value && node?.["@id"] === value["@id"]) ?? value;
}

function extractStructuredName(value, graphNodes) {
  const resolved = resolveGraphReference(value, graphNodes);
  if (Array.isArray(resolved)) return extractStructuredName(resolved[0], graphNodes);
  if (typeof resolved === "string") return cleanCandidate(resolved);
  if (!resolved || typeof resolved !== "object") return null;
  return cleanCandidate(resolved.name ?? resolved.legalName ?? resolved.alternateName);
}

function extractStructuredAddress(address, graphNodes) {
  const resolved = resolveGraphReference(address, graphNodes);
  if (typeof resolved === "string") return cleanCandidate(resolved);
  if (!resolved || typeof resolved !== "object") return null;

  const country = extractStructuredName(resolved.addressCountry, graphNodes) ?? cleanCandidate(resolved.addressCountry);
  const parts = [
    resolved.addressLocality,
    resolved.addressRegion,
    country,
  ].map(cleanCandidate).filter(Boolean);
  return parts.length ? parts.join(", ") : cleanCandidate(resolved.name);
}

function extractStructuredLocation(jobPosting, graphNodes) {
  const locations = arrayify(jobPosting.jobLocation)
    .map((location) => resolveGraphReference(location, graphNodes))
    .map((location) => {
      if (typeof location === "string") return cleanCandidate(location);
      if (!location || typeof location !== "object") return null;
      return extractStructuredAddress(location.address, graphNodes) ?? extractStructuredName(location, graphNodes);
    })
    .filter(Boolean);

  const isRemote = arrayify(jobPosting.jobLocationType).some((type) => /telecommute|remote/i.test(String(type)));
  const applicantLocations = arrayify(jobPosting.applicantLocationRequirements)
    .map((location) => extractStructuredName(location, graphNodes) ?? extractStructuredAddress(location?.address, graphNodes))
    .filter(Boolean);

  if (isRemote && applicantLocations.length) return `Remote - ${applicantLocations.join(", ")}`;
  if (isRemote && !locations.length) return "Remote";
  if (isRemote && locations.length) return `${locations.join(" / ")} / Remote`;
  return locations.length ? locations.join(" / ") : null;
}

function parseStructuredMoneyValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "object") return parseStructuredMoneyValue(value.value ?? value.minValue ?? value.maxValue);
  const match = String(value).match(/(\d{2,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*([kKmM])?/);
  if (!match) return null;
  return parseMoneyAmount(match[1], match[2]);
}

function extractStructuredSalaryLine(jobPosting) {
  for (const salary of arrayify(jobPosting.baseSalary)) {
    if (!salary) continue;
    const salaryValue = typeof salary === "object" ? salary.value ?? salary : salary;
    const unitText = [salary?.unitText, salaryValue?.unitText].map(normalizeOptional).filter(Boolean).join(" ");
    if (unitText && isHourlyContext(unitText)) continue;

    const min = parseStructuredMoneyValue(salaryValue?.minValue ?? salary?.minValue);
    const max = parseStructuredMoneyValue(salaryValue?.maxValue ?? salary?.maxValue);
    const value = parseStructuredMoneyValue(salaryValue?.value ?? salaryValue);
    const currency = normalizeOptional(salary?.currency ?? salaryValue?.currency ?? "USD");

    if (min && max) return `Salary: ${currency} ${min} - ${max}`;
    if (value) return `Salary: ${currency} ${value}`;
  }
  return null;
}

function extractStructuredJobPayload(html) {
  const scriptMatches = String(html ?? "").matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const graphNodes = [];
  for (const match of scriptMatches) {
    try {
      graphNodes.push(...flattenJsonLd(JSON.parse(decodeHtmlEntities(match[1]).trim())));
    } catch {
      continue;
    }
  }

  const jobPosting = graphNodes.find(looksLikeJobPosting);
  if (!jobPosting) return null;

  const hiringOrganization = resolveGraphReference(jobPosting.hiringOrganization, graphNodes);
  return {
    title: normalizeOptional(jobPosting.title),
    company: extractStructuredName(hiringOrganization, graphNodes),
    location: extractStructuredLocation(jobPosting, graphNodes),
    employmentType: arrayify(jobPosting.employmentType).map(cleanCandidate).filter(Boolean).join(", ") || null,
    salary: extractStructuredSalaryLine(jobPosting),
    description: stripHtmlToText(jobPosting.description ?? ""),
  };
}

export function extractJobPageDataFromHtml(html) {
  const structured = extractStructuredJobPayload(html);
  const metadata = extractHtmlMetadata(html);
  const pageTitle = structured?.title ?? metadata.title;
  const rawTextParts = [
    structured?.title,
    structured?.company,
    structured?.location,
    structured?.employmentType,
    structured?.salary,
    structured?.description,
  ].filter(Boolean);
  const rawText = rawTextParts.length ? rawTextParts.join("\n") : [pageTitle, metadata.description, stripHtmlToText(html)].filter(Boolean).join("\n");

  return {
    pageTitle,
    rawText,
    structured,
  };
}

export async function fetchJobPageData(sourceUrl) {
  let normalizedUrl = null;
  try {
    normalizedUrl = normalizeFetchUrl(sourceUrl);
  } catch (error) {
    return {
      attempted: Boolean(sourceUrl),
      success: false,
      sourceUrl: String(sourceUrl ?? ""),
      status: null,
      contentType: null,
      bytes: 0,
      error: error.message,
      pageTitle: null,
      rawTextLength: 0,
    };
  }
  const result = {
    attempted: Boolean(normalizedUrl),
    success: false,
    sourceUrl: normalizedUrl,
    status: null,
    contentType: null,
    bytes: 0,
    error: null,
    pageTitle: null,
    rawTextLength: 0,
  };

  if (!normalizedUrl) return result;

  try {
    await validateFetchUrl(normalizedUrl);
    const response = await axios.get(normalizedUrl, {
      timeout: FETCH_TIMEOUT_MS,
      maxRedirects: 3,
      maxContentLength: MAX_FETCH_BYTES,
      responseType: "text",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": "JobAppLedger/1.0 (+https://localhost)",
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const body = String(response.data ?? "");
    const contentType = String(response.headers?.["content-type"] ?? "");
    if (contentType && !contentType.toLowerCase().includes("html") && !contentType.toLowerCase().includes("text")) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const extracted = extractJobPageDataFromHtml(body);
    result.success = true;
    result.status = response.status;
    result.contentType = contentType || null;
    result.bytes = Buffer.byteLength(body);
    result.pageTitle = extracted.pageTitle;
    result.rawTextLength = extracted.rawText?.length ?? 0;
    result.rawText = extracted.rawText;
    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

export function detectJobSource({ sourceUrl, sourceDomain } = {}) {
  const domain = normalizeOptional(sourceDomain)?.replace(/^www\./i, "").toLowerCase() ?? getDomainFromUrl(sourceUrl);
  if (!domain) return { sourceDomain: null, source: null };

  const matched = JOB_SOURCES.find((source) =>
    source.patterns.some((pattern) => domain === pattern || domain.endsWith(`.${pattern}`)),
  );

  return {
    sourceDomain: domain,
    source: matched?.name ?? null,
  };
}

export function cleanJobText(rawText) {
  const text = normalizeOptional(rawText);
  if (!text) return null;

  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !/^(apply now|share this job|cookie policy|privacy policy|sign in to save)$/i.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function titleCandidatesFromPageTitle(pageTitle) {
  const title = cleanCandidate(pageTitle);
  if (!title) return [];

  const candidates = [];
  const parts = splitTitleParts(title);
  if (parts.length < 2) {
    candidates.push({ value: title.replace(/\s+\|\s+(LinkedIn|Indeed|Glassdoor).*$/i, ""), source: "pageTitle", weight: 20 });
  }

  if (parts.length >= 2) {
    parts.forEach((part, index) => {
      candidates.push({ value: part, source: "pageTitlePart", weight: index === 0 ? 18 : 14 });
    });
  }

  const atMatch = title.match(/^(.+?)\s+at\s+(.+?)$/i);
  if (atMatch) candidates.push({ value: atMatch[1], source: "pageTitleAt", weight: 22 });

  return candidates;
}

function titleCandidateFromUrl(sourceUrl) {
  if (!sourceUrl) return null;
  try {
    const parsed = new URL(sourceUrl);
    const domain = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (domain.endsWith("greenhouse.io") && parts.some((part) => part.toLowerCase() === "jobs")) {
      const jobIndex = parts.findIndex((part) => part.toLowerCase() === "jobs");
      const afterJobs = parts.slice(jobIndex + 1).filter((part) => !/^\d+$/.test(part));
      if (!afterJobs.length) return null;
      return titleCaseSlug(decodeURIComponent(afterJobs.at(-1)));
    }

    const ignored = new Set(["jobs", "job", "careers", "view", "posting", "boards"]);
    const slug = [...parts]
      .reverse()
      .find((part) => !ignored.has(part.toLowerCase()) && !/^\d+$/.test(part) && part.length > 3);
    return slug ? titleCaseSlug(decodeURIComponent(slug)) : null;
  } catch {
    return null;
  }
}

function buildTitleCandidates({ pageTitle, rawText, sourceUrl } = {}) {
  const candidates = [...titleCandidatesFromPageTitle(pageTitle)];

  getMeaningfulLines(rawText, 8).forEach((line, index) => {
    const labelMatch = line.match(TITLE_LABEL_PATTERN);
    candidates.push({
      value: labelMatch ? labelMatch[1] : line,
      source: labelMatch ? "titleLabel" : "topLine",
      weight: (labelMatch ? 24 : 16) - index,
    });
  });

  const urlCandidate = titleCandidateFromUrl(sourceUrl);
  if (urlCandidate) candidates.push({ value: urlCandidate, source: "url", weight: 8 });

  return candidates;
}

function scoreTitleCandidate(candidate, index) {
  const value = cleanCandidate(candidate.value);
  if (isRejectedTitle(value)) return -1;

  let score = candidate.weight ?? 0;
  const words = value.split(/\s+/).length;
  if (hasRoleKeyword(value)) score += 35;
  if (/^(senior|staff|principal|lead|junior|sr\.?|jr\.?)\b/i.test(value)) score += 8;
  if (candidate.source === "titleLabel") score += 10;
  if (index < 4) score += 5;
  if (value.length <= 80) score += 5;
  if (words > 10) score -= 8;
  if (/[.!?]$/.test(value)) score -= 12;
  return score;
}

function rankTitleCandidates(candidates) {
  return candidates
    .map((candidate, index) => {
      const score = scoreTitleCandidate(candidate, index);
      return {
        ...candidate,
        value: cleanCandidate(candidate.value),
        score,
        rejected: score < 0,
      };
    })
    .filter((candidate) => candidate.value && candidate.score >= 0)
    .sort((a, b) => b.score - a.score);
}

export function extractTitle({ pageTitle, rawText, sourceUrl } = {}) {
  const ranked = rankTitleCandidates(buildTitleCandidates({ pageTitle, rawText, sourceUrl }));

  return ranked[0]?.value ?? null;
}

function companyFromPageTitle(pageTitle, parsedTitle) {
  const title = cleanCandidate(pageTitle);
  if (!title) return null;

  const atMatch = title.match(/^(.+?)\s+at\s+(.+?)$/i);
  if (atMatch && hasRoleKeyword(atMatch[1])) return cleanCompanyName(atMatch[2]);

  const parts = splitTitleParts(title);
  if (parts.length < 2) return null;

  const titleIndex = parts.findIndex((part) => hasRoleKeyword(part) || part?.toLowerCase() === parsedTitle?.toLowerCase());
  if (titleIndex === 0) return cleanCompanyName(parts[1]);
  if (titleIndex > 0) return cleanCompanyName(parts[0]);
  return null;
}

function companyFromUrl(sourceUrl, source) {
  if (!sourceUrl) return null;
  try {
    const parsed = new URL(sourceUrl);
    const parts = parsed.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
    const domain = parsed.hostname.replace(/^www\./i, "").toLowerCase();

    if (source === "Greenhouse" && parts[0]) return cleanCompanyName(titleCaseSlug(parts[0]));
    if (source === "Lever" && parts[0]) return cleanCompanyName(titleCaseSlug(parts[0]));
    if (source === "Ashby" && parts[0]) return cleanCompanyName(titleCaseSlug(parts[0]));
    if (source === "Workday") {
      const hostPart = domain.split(".")[0];
      const company = hostPart.replace(/^wd\d+$/i, "");
      if (company) return cleanCompanyName(titleCaseSlug(company));
    }

    if (!source) {
      const domainParts = domain.split(".");
      const secondLevel = domainParts.length >= 2 ? domainParts.at(-2) : domainParts[0];
      return cleanCompanyName(titleCaseSlug(secondLevel));
    }
  } catch {
    return null;
  }
  return null;
}

function companyFromRawText(rawText, parsedTitle, markersOnly = false) {
  const lines = getMeaningfulLines(rawText, 20);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const labelMatch = line.match(COMPANY_LABEL_PATTERN);
    if (labelMatch) return cleanCompanyName(labelMatch[1]);
    if (/^(company|organization|hiring organization|employer)$/i.test(line) && lines[index + 1]) {
      return cleanCompanyName(lines[index + 1]);
    }
  }

  if (markersOnly) return null;

  const titleIndex = lines.findIndex((line) => line.toLowerCase() === parsedTitle?.toLowerCase());
  const topLineCandidates = titleIndex >= 0 ? lines.slice(titleIndex + 1, titleIndex + 4) : lines.slice(0, 4);
  return topLineCandidates
    .map(cleanCompanyName)
    .find((line) => line && !hasRoleKeyword(line) && !/^(remote|hybrid|onsite|on-site|location\b)/i.test(line)) ?? null;
}

export function extractCompany({ pageTitle, rawText, sourceUrl, source, parsedTitle } = {}) {
  const pageTitleCompany = companyFromPageTitle(pageTitle, parsedTitle);
  if (pageTitleCompany) return pageTitleCompany;

  const labeledCompany = companyFromRawText(rawText, parsedTitle, true);
  if (labeledCompany) return labeledCompany;

  const urlCompany = companyFromUrl(sourceUrl, source);
  if (urlCompany) return urlCompany;

  return companyFromRawText(rawText, parsedTitle) ?? null;
}

function cleanLocationCandidate(value) {
  const location = cleanCandidate(value);
  if (!location || location.length > 120) return null;
  if (/^(salary|compensation|pay range|job title|role|company)\b/i.test(location)) return null;
  if (location.split(/\s+/).length > 12 && /[.!?]$/.test(location)) return null;
  return location;
}

function cityStateFromText(text) {
  const cityStateMatch = String(text ?? "").match(/\b([A-Z][a-zA-Z .'-]+,\s?(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY)(?:,\s?(?:United States|USA|US))?)\b/);
  return cleanLocationCandidate(cityStateMatch?.[1]);
}

export function extractLocation(rawText) {
  const text = normalizeOptional(rawText);
  if (!text) return null;

  const lines = getMeaningfulLines(text, 24);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const labelMatch = line.match(LOCATION_LABEL_PATTERN);
    if (labelMatch) {
      const location = cleanLocationCandidate(labelMatch[1]);
      if (location) return location;
    }
    if (/^(location|locations|job location|work location|office|offices|workplace type)$/i.test(line) && lines[index + 1]) {
      const location = cleanLocationCandidate(lines[index + 1]);
      if (location) return location;
    }
  }

  const remoteLine = lines.find((line) =>
    /\b(remote|hybrid|onsite|on-site)\b/i.test(line) &&
    line.length <= 100 &&
    !/[.!?]$/.test(line) &&
    !/^(this|we|you|the role)\b/i.test(line)
  );
  if (remoteLine) return remoteLine;

  return cityStateFromText(text);
}

function isHourlyContext(text) {
  return /\b(hourly|per hour|\/\s?hr|\/\s?hour|an hour|hour|hr)\b/i.test(text);
}

function parseMoneyAmount(rawValue, suffix) {
  const numeric = Number(String(rawValue).replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return null;

  const normalizedSuffix = suffix?.trim().toLowerCase();
  const value =
    normalizedSuffix === "k"
      ? numeric * 1000
      : normalizedSuffix === "m"
        ? numeric * 1000000
        : numeric;
  if (value < 20000 || value > 1000000) return null;
  return Math.round(value);
}

function collectSalaryAmountsFromLine(line) {
  const amounts = [];
  const matches = String(line ?? "").matchAll(/(?:USD|CAD|US\$|CA\$)?\s*\$?\s*(\d{2,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*([kKmM])?\b/g);
  for (const match of matches) {
    const value = parseMoneyAmount(match[1], match[2]);
    if (value) amounts.push(value);
  }
  return amounts;
}

export function extractSalaryRange(rawText) {
  const text = normalizeOptional(rawText);
  if (!text) return { min: null, max: null };

  const salaryLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /(\$|usd|cad|salary|compensation|pay range|base pay|annual base|on-target earnings|ote)/i.test(line))
    .filter((line) => !isHourlyContext(line));

  const amounts = [];
  for (const line of salaryLines) {
    amounts.push(...collectSalaryAmountsFromLine(line));
    if (amounts.length >= 2) break;
  }

  const unique = [...new Set(amounts)];
  if (unique.length >= 2) {
    const [min, max] = unique.slice(0, 2).sort((a, b) => a - b);
    return { min, max };
  }

  return { min: unique[0] ?? null, max: null };
}

function salaryDebug(rawText) {
  const text = normalizeOptional(rawText);
  if (!text) return [];

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /(\$|usd|cad|salary|compensation|pay range|base pay|annual base|on-target earnings|ote)/i.test(line))
    .slice(0, 12)
    .map((line) => {
      const ignoredHourly = isHourlyContext(line);
      const amounts = collectSalaryAmountsFromLine(line);
      return { line, ignoredHourly, amounts };
    });
}

export function extractSkills(rawText) {
  const text = normalizeOptional(rawText);
  if (!text) return [];

  const matches = [];
  SKILL_PATTERNS.forEach((skill, skillIndex) => {
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[^a-z0-9+#])${escapedSkill}([^a-z0-9+#]|$)`, "gi");
    for (const match of text.matchAll(pattern)) {
      const start = match.index + match[1].length;
      matches.push({ skill, skillIndex, start, end: start + skill.length });
    }
  });

  return SKILL_PATTERNS.filter((skill, skillIndex) =>
    matches.some((match) => {
      if (match.skillIndex !== skillIndex) return false;
      return !matches.some(
        (other) =>
          other.skillIndex !== skillIndex &&
          other.start <= match.start &&
          other.end >= match.end &&
          other.skill.length > match.skill.length,
      );
    }),
  );
}

function summarizeFetchResult(fetchResult) {
  if (!fetchResult) return null;
  const { rawText, ...summary } = fetchResult;
  return {
    ...summary,
    rawTextPreview: rawText ? truncate(rawText, 600) : null,
  };
}

function buildParserDebug({ input, sourceUrl, sourceDomain, pageTitle, rawText, cleanedText, sourceInfo, parsed, fetchResult }) {
  const meaningfulLines = getMeaningfulLines(cleanedText, 40);
  const titleCandidates = rankTitleCandidates(buildTitleCandidates({ pageTitle, rawText: cleanedText, sourceUrl })).slice(0, 15);
  const titleIndex = meaningfulLines.findIndex((line) => line.toLowerCase() === parsed.parsedTitle?.toLowerCase());
  const companyTopLineCandidates = titleIndex >= 0 ? meaningfulLines.slice(titleIndex + 1, titleIndex + 4) : meaningfulLines.slice(0, 4);

  return {
    urlFetching: summarizeFetchResult(fetchResult) ?? {
      attempted: false,
      reason: "No URL fetch was requested. rawText and pageTitle came from the request payload.",
    },
    normalizedInput: {
      sourceUrl,
      fetchUrl: input.fetchUrl ?? sourceUrl,
      sourceDomain,
      pageTitle,
      rawTextLength: rawText?.length ?? 0,
      cleanedTextLength: cleanedText?.length ?? 0,
      debugRequested: Boolean(input.debug),
    },
    textPreview: {
      rawText: truncate(rawText),
      cleanedText: truncate(cleanedText),
      firstMeaningfulLines: meaningfulLines,
    },
    candidates: {
      title: titleCandidates,
      company: {
        fromPageTitle: companyFromPageTitle(pageTitle, parsed.parsedTitle),
        fromUrl: companyFromUrl(sourceUrl, sourceInfo.source),
        topLinesChecked: companyTopLineCandidates,
      },
      location: {
        markerMatch: cleanedText?.match(/(?:^|\n)\s*(?:location|work location|based in|office)\s*[:\-]?\s*([^\n]+)/i)?.[1] ?? null,
        remoteOrHybridLines: meaningfulLines.filter((line) => /\b(remote|hybrid|onsite|on-site)\b/i.test(line)).slice(0, 8),
      },
      salary: salaryDebug(cleanedText),
      skills: extractSkills(cleanedText),
    },
    decision: {
      source: sourceInfo.source,
      parsedTitle: parsed.parsedTitle,
      parsedCompany: parsed.parsedCompany,
      parsedLocation: parsed.parsedLocation,
      parsedSalaryMin: parsed.parsedSalaryMin,
      parsedSalaryMax: parsed.parsedSalaryMax,
      confidence: parsed.confidence,
    },
  };
}

export function scoreParserResult(parsed) {
  let score = 0;
  if (parsed.parsedTitle) score += 0.25;
  if (parsed.parsedCompany) score += 0.2;
  if (parsed.parsedLocation) score += 0.15;
  if (parsed.parsedSalaryMin || parsed.parsedSalaryMax) score += 0.1;
  if (parsed.parsedDescription && parsed.parsedDescription.length >= 100) score += 0.2;
  if (parsed.source) score += 0.1;
  return Math.min(1, Number(score.toFixed(2)));
}

export function parseJobDescription(input = {}) {
  const sourceUrl = normalizeUrl(normalizeOptional(input.sourceUrl));
  const sourceDomain = normalizeOptional(input.sourceDomain) ?? getDomainFromUrl(sourceUrl);
  const pageTitle = normalizeOptional(input.pageTitle);
  const rawText = normalizeOptional(input.rawText);
  const cleanedText = cleanJobText(rawText);
  const sourceInfo = detectJobSource({ sourceUrl, sourceDomain });

  const parsedTitle = extractTitle({ pageTitle, rawText: cleanedText, sourceUrl });
  const parsedCompany = extractCompany({
    pageTitle,
    rawText: cleanedText,
    sourceUrl,
    source: sourceInfo.source,
    parsedTitle,
  });
  const parsedLocation = extractLocation(cleanedText);
  const salary = extractSalaryRange(cleanedText);

  const parsed = {
    sourceUrl,
    sourceDomain: sourceInfo.sourceDomain ?? sourceDomain,
    source: sourceInfo.source,
    parsedTitle,
    parsedCompany,
    parsedLocation,
    parsedSalaryMin: salary.min,
    parsedSalaryMax: salary.max,
    parsedDescription: cleanedText,
  };

  const result = {
    ...parsed,
    confidence: scoreParserResult(parsed),
    skills: extractSkills(cleanedText),
  };

  if (input.debug) {
    result.debug = buildParserDebug({
      input,
      sourceUrl,
      sourceDomain: parsed.sourceDomain,
      pageTitle,
      rawText,
      cleanedText,
      sourceInfo,
      parsed: result,
      fetchResult: input.fetchResult,
    });
    console.info("[parser:job-description]", JSON.stringify(result.debug, null, 2));
  }

  return result;
}

export async function parseJobDescriptionWithFetch(input = {}) {
  const sourceUrl = normalizeUrl(normalizeOptional(input.sourceUrl));
  const fetchUrl = normalizeOptional(input.fetchUrl) ?? sourceUrl;
  const shouldFetch = Boolean(fetchUrl && !normalizeOptional(input.rawText));
  let fetchResult = {
    attempted: false,
    reason: normalizeOptional(input.rawText)
      ? "Skipped because rawText was supplied in the request."
      : "Skipped because sourceUrl was not supplied.",
  };
  let enrichedInput = { ...input };

  if (shouldFetch) {
    fetchResult = await fetchJobPageData(fetchUrl);
    if (fetchResult.success && fetchResult.rawText) {
      enrichedInput = {
        ...enrichedInput,
        pageTitle: normalizeOptional(enrichedInput.pageTitle) ?? fetchResult.pageTitle,
        rawText: fetchResult.rawText,
      };
    }
  }

  const parsed = parseJobDescription({ ...enrichedInput, fetchResult });
  return {
    ...parsed,
    pageTitle: normalizeOptional(enrichedInput.pageTitle),
    rawText: normalizeOptional(enrichedInput.rawText),
    fetchResult,
  };
}
