# models.dev-rss

Minimal server that converts `https://models.dev/api.json` into RSS on demand.
Built with Hono so the same app runs on Node and Cloudflare Workers.

Node runtime can optionally emit OpenTelemetry traces and metrics.

## Run

```bash
npm run start
# to test
npm run test
```

Local check URLs (Node server):

- `http://localhost:3000/`
- `http://localhost:3000/rss`

Optional environment variables:

- `PORT` (default: `3000`)
- `MAX_ITEMS` (default: `1000`) limits RSS item count
- `FEED_BASE_URL` (optional) overrides feed links base URL
- `OTEL_ENABLED` set to `true` to enable Node-only OpenTelemetry
- `OTEL_EXPORTER_OTLP_ENDPOINT` shared OTLP backend endpoint for traces and metrics
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` optional trace endpoint when not using shared endpoint
- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` optional metrics endpoint when not using shared endpoint
- `OTEL_SERVICE_NAME` (optional) overrides the default service name `models.dev-rss`

## OpenTelemetry

- Node server only. Worker runtime stays uninstrumented.
- Disabled by default.
- Uses OpenTelemetry auto-instrumentation.
- When `OTEL_ENABLED=true`, you must set either:
  - `OTEL_EXPORTER_OTLP_ENDPOINT`, or
  - both `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`
- If OTel config is invalid or SDK init fails, the server logs a warning and keeps serving traffic.

Example:

```bash
OTEL_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.example/v1 \
OTEL_SERVICE_NAME=models-dev-rss \
npm run start
```

## Endpoints

- `GET /` plain text usage hint
- `GET /rss` fetches `api.json`, converts to RSS 2.0, returns `application/rss+xml`
- `GET /rss?providerId=openai&providerId=openrouter` filters the feed to matching upstream provider ids and appends the matched provider names to the channel title

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
