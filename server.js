#!/usr/bin/env node
import { startOpenTelemetry } from "./otel.js";

startOpenTelemetry();

const [{ serve }, { default: app }] = await Promise.all([
  import("@hono/node-server"),
  import("./app.js"),
]);

const port = Number(process.env.PORT || 3000);

serve({ fetch: app.fetch, port }, (info) => {
  process.stdout.write(`Listening on http://localhost:${info.port}\n`);
});
