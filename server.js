#!/usr/bin/env node
import { serve } from "@hono/node-server";
import app from "./app.js";

const port = Number(process.env.PORT || 3000);

serve({ fetch: app.fetch, port }, (info) => {
  process.stdout.write(`Listening on http://localhost:${info.port}\n`);
});
