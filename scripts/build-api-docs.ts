#!/usr/bin/env tsx
/**
 * build-api-docs.ts
 *
 * Starts the Relay server in-process, extracts the OpenAPI JSON spec,
 * writes it to docs/api/openapi.json, then runs @redocly/cli to bundle
 * a static HTML reference at docs/api/index.html.
 *
 * Usage:
 *   pnpm docs:build
 *   npx tsx scripts/build-api-docs.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')

const OUTPUT_DIR = resolve(root, 'docs', 'api')
const OPENAPI_PATH = resolve(OUTPUT_DIR, 'openapi.json')
const HTML_PATH = resolve(OUTPUT_DIR, 'index.html')

async function main() {
  console.log('[docs] Building API reference documentation...')

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // Try to extract OpenAPI spec from a running or buildable server.
  // If the relay can't be imported (missing deps / DB), fall back to a
  // minimal spec assembled from the route schemas.
  let spec: Record<string, unknown> | null = null

  try {
    // Set minimal env so the config loader doesn't crash
    process.env.DATABASE_URL ??= 'postgresql://localhost:5432/attestara'
    process.env.REDIS_URL ??= 'redis://localhost:6379'
    process.env.JWT_SECRET ??= 'docs-build-secret-not-for-production'
    process.env.CORS_ORIGIN ??= 'http://localhost:3000'
    process.env.NODE_ENV ??= 'development'

    const { buildServer } = await import('../packages/relay/src/server.js')
    const app = await buildServer({ logger: false })
    await app.ready()
    spec = app.swagger() as Record<string, unknown>
    await app.close()
    console.log('[docs] Extracted OpenAPI spec from relay server')
  } catch (err) {
    console.warn('[docs] Could not start relay server, using fallback spec')
    console.warn('[docs]', (err as Error).message)

    // Fallback: write a minimal valid OpenAPI 3.0 spec
    spec = {
      openapi: '3.0.0',
      info: {
        title: 'Attestara Relay API',
        description:
          'Cryptographic trust protocol for autonomous AI agent commerce. ' +
          'This is a placeholder spec -- build with a running PostgreSQL/Redis to get the full schema.',
        version: '0.1.0',
      },
      servers: [{ url: 'http://localhost:3001', description: 'Development' }],
      paths: {},
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    }
  }

  // Write OpenAPI JSON
  writeFileSync(OPENAPI_PATH, JSON.stringify(spec, null, 2))
  console.log(`[docs] Wrote ${OPENAPI_PATH}`)

  // Build static HTML with redocly
  try {
    execSync(
      `npx @redocly/cli build-docs ${OPENAPI_PATH} --output ${HTML_PATH}`,
      { cwd: root, stdio: 'inherit' },
    )
    console.log(`[docs] Built ${HTML_PATH}`)
  } catch {
    console.warn('[docs] @redocly/cli not available, writing basic HTML wrapper')
    writeFileSync(
      HTML_PATH,
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Attestara API Reference</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  <style>body { margin: 0; font-family: 'Inter', sans-serif; }</style>
</head>
<body>
  <div id="redoc-container"></div>
  <script>Redoc.init('./openapi.json', { scrollYOffset: 0, hideDownloadButton: false }, document.getElementById('redoc-container'))</script>
</body>
</html>`,
    )
    console.log(`[docs] Wrote fallback HTML at ${HTML_PATH}`)
  }

  console.log('[docs] Done!')
}

main().catch((err) => {
  console.error('[docs] Fatal error:', err)
  process.exit(1)
})
