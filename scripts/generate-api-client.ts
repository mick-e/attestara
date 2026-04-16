#!/usr/bin/env tsx
/**
 * Generate TypeScript types from the Attestara relay OpenAPI spec.
 *
 * Usage:
 *   pnpm generate:api-types
 *
 * What it does:
 * 1. Boots a temporary relay server to dump the OpenAPI JSON spec
 * 2. Runs openapi-typescript to generate TypeScript types
 * 3. Writes the output to packages/sdk/src/api-types.generated.ts
 *
 * In CI, run this followed by `git diff --exit-code` to ensure
 * the generated types are up to date.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const OPENAPI_JSON_PATH = resolve(__dirname, '../packages/sdk/openapi.json')
const OUTPUT_PATH = resolve(__dirname, '../packages/sdk/src/api-types.generated.ts')
const RELAY_URL = process.env.RELAY_URL ?? 'http://localhost:3001'

async function main() {
  console.log('Generating API types from OpenAPI spec...')

  // Step 1: Fetch the OpenAPI spec from the relay server
  // If RELAY_URL is set, fetch from a running server.
  // Otherwise, try to build and extract it programmatically.
  let specJson: string

  try {
    // Try fetching from a running relay server
    const response = await fetch(`${RELAY_URL}/docs/json`)
    if (response.ok) {
      specJson = await response.text()
      console.log(`Fetched OpenAPI spec from ${RELAY_URL}/docs/json`)
    } else {
      throw new Error(`Server returned ${response.status}`)
    }
  } catch {
    // Fallback: try to build the spec programmatically
    console.log('No running relay server found, building spec programmatically...')

    // Set minimal env vars required by loadConfig()
    process.env.DATABASE_URL ??= 'postgresql://localhost:5432/attestara'
    process.env.JWT_SECRET ??= 'a'.repeat(32)
    process.env.PROVER_INTERNAL_SECRET ??= 'a'.repeat(16)
    process.env.ORG_MASTER_KEY_SECRET ??= 'a'.repeat(32)
    process.env.NODE_ENV ??= 'development'

    try {
      const { buildServer } = await import('../packages/relay/src/server.js')
      const app = await buildServer({ logger: false })
      await app.ready()
      const spec = app.swagger()
      specJson = JSON.stringify(spec, null, 2)
      await app.close()
      console.log('Built OpenAPI spec from relay server code')
    } catch (err) {
      console.error('Failed to build spec programmatically:', err)
      console.error('Please start the relay server or set RELAY_URL env var')
      process.exit(1)
    }
  }

  // Step 2: Write the OpenAPI JSON spec
  mkdirSync(dirname(OPENAPI_JSON_PATH), { recursive: true })
  writeFileSync(OPENAPI_JSON_PATH, specJson, 'utf-8')
  console.log(`Wrote OpenAPI spec to ${OPENAPI_JSON_PATH}`)

  // Step 3: Run openapi-typescript to generate types
  try {
    execSync(
      `npx openapi-typescript ${OPENAPI_JSON_PATH} -o ${OUTPUT_PATH}`,
      { stdio: 'inherit', cwd: resolve(__dirname, '..') },
    )
    console.log(`Generated API types at ${OUTPUT_PATH}`)
  } catch (err) {
    console.error('Failed to run openapi-typescript:', err)
    process.exit(1)
  }

  console.log('Done!')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
