# models.dev-rss

Minimal server that converts `https://models.dev/api.json` into RSS on demand.
Built with Hono so the same app runs on Node and Cloudflare Workers.

Node runtime can optionally emit OpenTelemetry traces and metrics.
The Docker image in this repo is for the Node server only and publishes `linux/amd64` and `linux/arm64` variants.

## Run

```bash
npm run start
# to test
npm run test
```

Local check URLs (Node server):

- `http://localhost:3000/`
- `http://localhost:3000/health`
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

## Docker (`linux/amd64` + `linux/arm64`)

Build for your local platform:

```bash
docker build -t models.dev-rss:local .
```

Build a specific target architecture:

```bash
docker build --platform linux/amd64 -t models.dev-rss:amd64 .
docker build --platform linux/arm64 -t models.dev-rss:arm64 .
```

Run it:

```bash
docker run --rm \
  -p 3000:3000 \
  models.dev-rss:local
```

All Node env vars work the same in Docker:

```bash
docker run --rm \
  -p 8080:8080 \
  -e PORT=8080 \
  -e MAX_ITEMS=250 \
  -e FEED_BASE_URL=https://rss.example.com \
  -e OTEL_ENABLED=true \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.example/v1 \
  -e OTEL_SERVICE_NAME=models-dev-rss \
  models.dev-rss:local
```

If you change `PORT`, match the published port mapping to the container port.

On a different host architecture, pass `--platform linux/amd64` or `--platform linux/arm64` explicitly.

## GitHub Container Registry (`linux/amd64` + `linux/arm64`)

GitHub Actions publishes a multi-arch image to `ghcr.io/flexdinesh/models.dev-rss`.

Workflow:

- `Publish Docker image (amd64 + arm64)`

Tags:

- `sha-<full-commit-sha>` on every `main` push
- `latest` on the default branch

Pull and run the published image:

```bash
docker pull ghcr.io/flexdinesh/models.dev-rss:latest

docker run --rm \
  -p 3000:3000 \
  ghcr.io/flexdinesh/models.dev-rss:latest
```

If you need a specific published target, pull or run with `--platform linux/amd64` or `--platform linux/arm64`.

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
- `GET /health` returns JSON liveness status without calling upstream
- `GET /rss` fetches `api.json`, converts to RSS 2.0, returns `application/rss+xml`
- `GET /rss?providerId=openai&providerId=openrouter` filters the feed to matching upstream provider ids and appends the matched provider names to the channel title

## Cloudflare Worker

```bash
npm run dev
npm run deploy
```

Local check URLs (Wrangler dev):

- `http://localhost:8787/`
- `http://localhost:8787/health`
- `http://localhost:8787/rss`

For Worker `MAX_ITEMS`, add it as an env var in `wrangler.toml`:

```toml
[vars]
MAX_ITEMS = "1000"
FEED_BASE_URL = "https://your-domain.example"
```
