import { defineConfig } from 'vitest/config'

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
