# models.dev-rss

Minimal server that converts `https://models.dev/api.json` into RSS on demand.
Built with Hono so the same app runs on Node and Cloudflare Workers.

## Run

```bash
npm run start
```

Local check URLs (Node server):

- `http://localhost:3000/`
- `http://localhost:3000/rss`

Optional environment variables:

- `PORT` (default: `3000`)
- `MAX_ITEMS` (default: `1000`) limits RSS item count
- `FEED_BASE_URL` (optional) overrides feed links base URL

## Endpoints

- `GET /` plain text usage hint
- `GET /rss` fetches `api.json`, converts to RSS 2.0, returns `application/rss+xml`

## Cloudflare Worker

```bash
npm run dev
npm run deploy
```

Local check URLs (Wrangler dev):

- `http://localhost:8787/`
- `http://localhost:8787/rss`

For Worker `MAX_ITEMS`, add it as an env var in `wrangler.toml`:

```toml
[vars]
MAX_ITEMS = "1000"
FEED_BASE_URL = "https://your-domain.example"
```
