/**
 * OpenTelemetry tracing initialization for the Attestara prover.
 *
 * Import this module at the very top of start.ts (before any other imports)
 * so that auto-instrumentation can patch HTTP, Fastify, and ioredis.
 *
 * Gated on OTEL_EXPORTER_OTLP_ENDPOINT: if the env var is not set,
 * this module is a no-op and does not register any SDK.
 */

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT

if (endpoint) {
  const { NodeSDK } = await import('@opentelemetry/sdk-node')
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
  const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node')

  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'attestara-prover',
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  })

  sdk.start()

  process.on('SIGTERM', () => {
    sdk.shutdown().catch(console.error)
  })

  console.log(`OpenTelemetry tracing enabled, exporting to ${endpoint}`)
}
