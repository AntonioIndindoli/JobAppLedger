function parseSourcesFromEnv(raw) {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((source) => {
        if (!source || typeof source !== "object") return null;

        const name = typeof source.name === "string" ? source.name.trim() : "";
        const feedUrl = typeof source.feedUrl === "string" ? source.feedUrl.trim() : "";
        const enabled = source.enabled === undefined ? true : Boolean(source.enabled);

        if (!name || !feedUrl || !enabled) return null;

        return {
          name,
          feedUrl,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function getIngestionSources() {
  return parseSourcesFromEnv(process.env.RSS_SOURCES_JSON);
}
