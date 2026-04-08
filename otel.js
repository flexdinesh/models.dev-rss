import process from "node:process";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";

const DEFAULT_SERVICE_NAME = "models.dev-rss";
const SHUTDOWN_SIGNALS = ["SIGINT", "SIGTERM"];

function readString(env, key) {
  const value = env[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function isEnabled(value) {
  return typeof value === "string" && value.trim().toLowerCase() === "true";
}

export function resolveOpenTelemetryConfig(env = process.env) {
  const enabled = isEnabled(env.OTEL_ENABLED);
  const sharedEndpoint = readString(env, "OTEL_EXPORTER_OTLP_ENDPOINT");
  const tracesEndpoint = readString(env, "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT");
  const metricsEndpoint = readString(env, "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT");
  const hasEndpoint =
    sharedEndpoint !== undefined ||
    (tracesEndpoint !== undefined && metricsEndpoint !== undefined);

  return {
    enabled,
    hasEndpoint,
    serviceName: readString(env, "OTEL_SERVICE_NAME") || DEFAULT_SERVICE_NAME,
  };
}

function defaultWarn(message, error) {
  process.stderr.write(
    `${message}${error instanceof Error ? ` ${error.message}` : ""}\n`
  );
}

function createSdk(config) {
  return new NodeSDK({
    serviceName: config.serviceName,
    instrumentations: [getNodeAutoInstrumentations()],
    logRecordProcessors: [],
  });
}

function registerShutdownHandlers(runtimeProcess, sdk, onWarn) {
  for (const signal of SHUTDOWN_SIGNALS) {
    runtimeProcess.once(signal, () => {
      sdk
        .shutdown()
        .catch((error) => {
          onWarn(`[otel] shutdown failed`, error);
        })
        .finally(() => {
          if (typeof runtimeProcess.exit === "function") {
            runtimeProcess.exit(0);
          }
        });
    });
  }
}

export function startOpenTelemetry({
  env = process.env,
  onWarn = defaultWarn,
  runtimeProcess = process,
  createSdkInstance = createSdk,
} = {}) {
  const config = resolveOpenTelemetryConfig(env);

  if (!config.enabled) {
    return null;
  }

  if (!config.hasEndpoint) {
    onWarn(
      "[otel] disabled: set OTEL_EXPORTER_OTLP_ENDPOINT or both OTEL_EXPORTER_OTLP_TRACES_ENDPOINT and OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"
    );
    return null;
  }

  try {
    const sdk = createSdkInstance(config);
    sdk.start();
    registerShutdownHandlers(runtimeProcess, sdk, onWarn);
    return sdk;
  } catch (error) {
    onWarn("[otel] disabled: init failed", error);
    return null;
  }
}
