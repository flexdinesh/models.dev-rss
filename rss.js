const DEFAULT_MAX_ITEMS = 1000;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapCdata(value) {
  return `<![CDATA[${String(value).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
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

function modelDescriptionHtml(item) {
  return escapeXml(modelDescription(item)).replaceAll("\n", "<br />\n");
}

function normalizeProviderIds(providerIds) {
  const values = Array.isArray(providerIds)
    ? providerIds
    : typeof providerIds === "string"
      ? [providerIds]
      : [];

  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function buildProviderEntries(data) {
  return Object.entries(data || {}).map(([providerKey, provider]) => {
    const providerId = provider?.id || providerKey;
    return {
      providerKey,
      providerId,
      providerName: provider?.name || providerKey,
      api: provider?.api || "",
      models: provider?.models || {},
    };
  });
}

function resolveSelectedProviders(providerEntries, providerIds) {
  if (providerIds.length === 0) {
    return [];
  }

  const lookup = new Map();
  for (const entry of providerEntries) {
    if (!lookup.has(entry.providerKey)) {
      lookup.set(entry.providerKey, entry);
    }
    if (!lookup.has(entry.providerId)) {
      lookup.set(entry.providerId, entry);
    }
  }

  const selected = [];
  const seen = new Set();

  for (const providerId of providerIds) {
    const entry = lookup.get(providerId);
    if (!entry || seen.has(entry.providerId)) {
      continue;
    }

    seen.add(entry.providerId);
    selected.push(entry);
  }

  return selected;
}

function buildChannelTitle(baseTitle, selectedProviders) {
  if (selectedProviders.length === 0) {
    return baseTitle;
  }

  const titleParts = selectedProviders
    .slice(0, 4)
    .map((provider) => provider.providerName);
  if (selectedProviders.length > 4) {
    titleParts.push("etc");
  }

  return `${baseTitle} - ${titleParts.join(", ")}`;
}

export function buildFeed(
  data,
  { origin, maxItems = DEFAULT_MAX_ITEMS, providerIds = [] } = {}
) {
  const selectedProviderIds = normalizeProviderIds(providerIds);
  const providerEntries = buildProviderEntries(data);
  const selectedProviders = resolveSelectedProviders(
    providerEntries,
    selectedProviderIds
  );
  const selectedProviderIdSet = new Set(selectedProviderIds);
  const items = [];

  for (const provider of providerEntries) {
    if (
      selectedProviderIdSet.size > 0 &&
      !selectedProviderIdSet.has(provider.providerKey) &&
      !selectedProviderIdSet.has(provider.providerId)
    ) {
      continue;
    }

    for (const [modelKey, model] of Object.entries(provider.models)) {
      items.push({
        provider: provider.providerName,
        providerId: provider.providerId,
        modelId: model?.id || modelKey,
        modelName: model?.name || modelKey,
        api: provider.api,
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
  const channelTitle = buildChannelTitle(
    "models.dev LLM Catalog",
    selectedProviders
  );
  const channelLink = `${origin}/rss`;
  const channelDescription = "RSS mirror generated from https://models.dev/api.json";

  const rssItems = sortedItems
    .map((item) => {
      const guid = `${item.providerId}/${item.modelId}`;
      const link = `https://models.dev/providers/${encodeURIComponent(item.providerId)}`;
      const plainDescription = modelDescription(item);
      const richDescription = modelDescriptionHtml(item);
      return [
        "    <item>",
        `      <title>${escapeXml(`${item.provider}: ${item.modelName}`)}</title>`,
        `      <description>${escapeXml(plainDescription)}</description>`,
        `      <content:encoded>${wrapCdata(richDescription)}</content:encoded>`,
        `      <guid isPermaLink=\"false\">${escapeXml(guid)}</guid>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <pubDate>${releaseDateToPubDate(item.releaseDate)}</pubDate>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
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
