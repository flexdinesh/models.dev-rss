# AGENTS.md

## Project Intent
- This project exposes an RSS feed generated from `https://models.dev/api.json`.
- A CDN is expected in front, so runtime logic should stay simple and stateless.

## Hard Rule: ESM Only
- Use ESM everywhere in this repo.
- `package.json` has `"type": "module"` and all source files must use `import`/`export`.
- Do not introduce CommonJS (`require`, `module.exports`, `.cjs`) files.

## Current Architecture
- Shared business logic lives in `rss.js` (`buildFeed`).
- Routing and upstream fetch live in `app.js` (Hono app).
- `server.js` is a thin Node entrypoint using `@hono/node-server`.
- `worker.js` is a thin Cloudflare Worker entrypoint exporting the same app.
- Keep logic centralized in `rss.js`/`app.js`; avoid duplicating behavior across runtimes.

## Feed Behavior Requirements
- Endpoint: `GET /rss` returns RSS 2.0 XML (`application/rss+xml`).
- Source data: fetch `https://models.dev/api.json` on request.
- Items are sorted by `model.release_date` descending (latest first).
- Item `pubDate` must come from `release_date` at `00:00:00 UTC`.
- Description should include all model JSON fields in readable flattened text.

## Config
- Node:
  - `PORT` (default `3000`)
  - `MAX_ITEMS` (default `1000`)
  - `FEED_BASE_URL` (optional override for feed link base URL)
- Cloudflare Worker:
  - `MAX_ITEMS` from Wrangler `[vars]` (fallback default `1000`)
  - `FEED_BASE_URL` from Wrangler `[vars]` (optional)

## Testing
- Use Node’s built-in test runner (`node --test`).
- Keep static tests for `rss.js` with predefined fixture input.
- Validate generated RSS XML and assert ordering + `pubDate` behavior.
