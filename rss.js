const DEFAULT_MAX_ITEMS = 1000;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function releaseDateToEpoch(releaseDate) {
  if (typeof releaseDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return 0;
  }
  const epoch = Date.parse(`${releaseDate}T00:00:00Z`);
  return Number.isFinite(epoch) ? epoch : 0;
}

function releaseDateToPubDate(releaseDate) {
  return new Date(releaseDateToEpoch(releaseDate)).toUTCString();
}

function flattenObject(value, prefix, lines) {
  if (value === null) {
    lines.push(`${prefix}: null`);
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${prefix}: []`);
      return;
    }

    const allPrimitive = value.every(
      (v) => v === null || ["string", "number", "boolean"].includes(typeof v)
    );
    if (allPrimitive) {
      const rendered = value.map((v) => JSON.stringify(v)).join(", ");
      lines.push(`${prefix}: [${rendered}]`);
      return;
    }

    value.forEach((item, index) => {
      flattenObject(item, `${prefix}[${index}]`, lines);
    });
    return;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      lines.push(`${prefix}: {}`);
      return;
    }

    entries
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, nestedValue]) => {
        const nestedPrefix = prefix ? `${prefix}.${key}` : key;
        flattenObject(nestedValue, nestedPrefix, lines);
      });
    return;
  }

  lines.push(`${prefix}: ${String(value)}`);
}

function modelDescription(item) {
  const lines = [];
  flattenObject(item.modelData, "model", lines);
  return [
    `Provider: ${item.provider}`,
    `Provider ID: ${item.providerId}`,
    item.api ? `Provider API: ${item.api}` : null,
    `Model ID: ${item.modelId}`,
    "",
    ...lines,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildFeed(data, { origin, maxItems = DEFAULT_MAX_ITEMS } = {}) {
  const providers = Object.entries(data || {});
  const items = [];

  for (const [providerKey, provider] of providers) {
    for (const [modelKey, model] of Object.entries(provider?.models || {})) {
      items.push({
        provider: provider?.name || providerKey,
        providerId: provider?.id || providerKey,
        modelId: model?.id || modelKey,
        modelName: model?.name || modelKey,
        api: provider?.api || "",
        releaseDate: model?.release_date || "",
        releaseDateEpoch: releaseDateToEpoch(model?.release_date),
        modelData: model || {},
      });
    }
  }

  const sortedItems = items
    .sort((a, b) => b.releaseDateEpoch - a.releaseDateEpoch)
    .slice(0, maxItems);

  const now = new Date().toUTCString();
  const channelTitle = "models.dev LLM Catalog";
  const channelLink = `${origin}/rss`;
  const channelDescription = "RSS mirror generated from https://models.dev/api.json";

  const rssItems = sortedItems
    .map((item) => {
      const guid = `${item.providerId}/${item.modelId}`;
      const link = `https://models.dev/providers/${encodeURIComponent(item.providerId)}`;
      return [
        "    <item>",
        `      <title>${escapeXml(`${item.provider}: ${item.modelName}`)}</title>`,
        `      <description>${escapeXml(modelDescription(item))}</description>`,
        `      <guid isPermaLink="false">${escapeXml(guid)}</guid>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <pubDate>${releaseDateToPubDate(item.releaseDate)}</pubDate>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    `    <title>${escapeXml(channelTitle)}</title>`,
    `    <link>${escapeXml(channelLink)}</link>`,
    `    <description>${escapeXml(channelDescription)}</description>`,
    `    <lastBuildDate>${now}</lastBuildDate>`,
    rssItems,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
