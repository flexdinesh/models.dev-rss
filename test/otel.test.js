import test from "node:test";
import assert from "node:assert/strict";
import { resolveOpenTelemetryConfig, startOpenTelemetry } from "../otel.js";

test("resolveOpenTelemetryConfig keeps otel disabled by default", () => {
  assert.deepEqual(resolveOpenTelemetryConfig({}), {
    enabled: false,
    hasEndpoint: false,
    serviceName: "models.dev-rss",
  });
});

test("resolveOpenTelemetryConfig accepts shared OTLP endpoint", () => {
  assert.deepEqual(
    resolveOpenTelemetryConfig({
      OTEL_ENABLED: "true",
      OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example/v1",
    }),
    {
      enabled: true,
      hasEndpoint: true,
      serviceName: "models.dev-rss",
    }
  );
});

test("resolveOpenTelemetryConfig requires both signal endpoints when shared endpoint is absent", () => {
  assert.equal(
    resolveOpenTelemetryConfig({
      OTEL_ENABLED: "true",
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://otel.example/v1/traces",
    }).hasEndpoint,
    false
  );

  assert.equal(
    resolveOpenTelemetryConfig({
      OTEL_ENABLED: "true",
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://otel.example/v1/traces",
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "https://otel.example/v1/metrics",
    }).hasEndpoint,
    true
  );
});

test("resolveOpenTelemetryConfig honors OTEL_SERVICE_NAME override", () => {
  assert.equal(
    resolveOpenTelemetryConfig({
      OTEL_ENABLED: "true",
      OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example/v1",
      OTEL_SERVICE_NAME: "custom-rss",
    }).serviceName,
    "custom-rss"
  );
});

test("startOpenTelemetry warns and skips init when endpoint is missing", () => {
  const warnings = [];
  let created = false;

  const sdk = startOpenTelemetry({
    env: { OTEL_ENABLED: "true" },
    onWarn: (message) => warnings.push(message),
    createSdkInstance: () => {
      created = true;
      return null;
    },
  });

  assert.equal(sdk, null);
  assert.equal(created, false);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /OTEL_EXPORTER_OTLP_ENDPOINT/);
});

test("startOpenTelemetry starts sdk when config is valid", async () => {
  const calls = [];
  const signalHandlers = [];
  let resolveExit;
  const exitPromise = new Promise((resolve) => {
    resolveExit = resolve;
  });
  const fakeSdk = {
    start() {
      calls.push("start");
    },
    shutdown() {
      calls.push("shutdown");
      return Promise.resolve();
    },
  };

  const sdk = startOpenTelemetry({
    env: {
      OTEL_ENABLED: "true",
      OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example/v1",
    },
    runtimeProcess: {
      once(signal, handler) {
        signalHandlers.push({ signal, handler });
      },
      exit(code) {
        calls.push(`exit:${code}`);
        resolveExit();
      },
    },
    createSdkInstance: (config) => {
      calls.push(config.serviceName);
      return fakeSdk;
    },
  });

  assert.equal(sdk, fakeSdk);
  assert.deepEqual(calls, ["models.dev-rss", "start"]);
  assert.deepEqual(
    signalHandlers.map(({ signal }) => signal),
    ["SIGINT", "SIGTERM"]
  );

  signalHandlers[0].handler();
  await exitPromise;
  assert.deepEqual(calls, ["models.dev-rss", "start", "shutdown", "exit:0"]);
});

test("startOpenTelemetry warns and continues when sdk init throws", () => {
  const warnings = [];

  const sdk = startOpenTelemetry({
    env: {
      OTEL_ENABLED: "true",
      OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example/v1",
    },
    onWarn: (message, error) => warnings.push(`${message}: ${error.message}`),
    createSdkInstance: () => {
      throw new Error("boom");
    },
  });

  assert.equal(sdk, null);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /init failed: boom/);
});
