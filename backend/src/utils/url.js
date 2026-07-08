export function normalizeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(String(url).trim());
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return String(url).trim().toLowerCase();
  }
}

export function getDomainFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(String(url).trim()).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}
