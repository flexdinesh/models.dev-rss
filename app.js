import { Hono } from "hono";
import { buildFeed } from "./rss.js";

const SOURCE_URL = "https://models.dev/api.json";

const app = new Hono();

function resolveMaxItems(c) {
  const workerEnvValue = c.env?.MAX_ITEMS;
  if (workerEnvValue !== undefined) {
    const parsed = Number(workerEnvValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
  }

  const nodeEnvValue = globalThis.process?.env?.MAX_ITEMS;
  if (nodeEnvValue !== undefined) {
    const parsed = Number(nodeEnvValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
  }

  return 1000;
}

/*
 *   - Local (default, no env): feed links use http://localhost:3000 (or current request host).
 *   - Cloudflare (default, no env): feed links use your deployed worker domain automatically.
 *   - Optional override:
 *       - Node: FEED_BASE_URL=https://your-domain.com npm run start
 *       - Worker (wrangler.toml):

 *         [vars]
 *         FEED_BASE_URL = "https://your-domain.com"

 *   Tests still pass with npm test.
*/
function resolveFeedBaseUrl(c) {
  const workerEnvValue = c.env?.FEED_BASE_URL;
  if (typeof workerEnvValue === "string" && workerEnvValue.trim().length > 0) {
    return workerEnvValue.trim().replace(/\/+$/, "");
  }

  const nodeEnvValue = globalThis.process?.env?.FEED_BASE_URL;
  if (typeof nodeEnvValue === "string" && nodeEnvValue.trim().length > 0) {
    return nodeEnvValue.trim().replace(/\/+$/, "");
  }

  return new URL(c.req.url).origin;
}

app.get("/", (c) => c.text("Use /rss\n"));

app.get("/rss", async (c) => {
  try {
    const upstream = await fetch(SOURCE_URL, {
      headers: { "user-agent": "models.dev RSS bridge" },
    });

    if (!upstream.ok) {
      return c.text(`Upstream fetch failed: ${upstream.status}\n`, 502);
    }

    const data = await upstream.json();
    const origin = resolveFeedBaseUrl(c);
    const rss = buildFeed(data, { origin, maxItems: resolveMaxItems(c) });

    return c.body(rss, 200, {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600", // 1h
    });
  } catch (error) {
    return c.text(`Upstream fetch failed: ${error.message}\n`, 502);
  }
});

export default app;
