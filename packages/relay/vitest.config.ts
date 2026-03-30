import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'

// Load test env vars if not already set
config({ path: '.env.test' })

export default defineConfig({
  test: {
    globals: false,
    testTimeout: 30000,
    include: ['test/**/*.test.ts'],
    // Serialize test files — they share a single PostgreSQL database
    fileParallelism: false,
    pool: 'forks',
  },
})
