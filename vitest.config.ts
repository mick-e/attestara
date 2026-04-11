// vitest.config.ts (root level)
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@attestara/types': path.resolve(__dirname, 'packages/types/src/index.ts'),
      '@attestara/sdk': path.resolve(__dirname, 'packages/sdk/src/index.ts'),
      '@attestara/relay': path.resolve(__dirname, 'packages/relay/src/index.ts'),
      '@attestara/prover': path.resolve(__dirname, 'packages/prover/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
  },
})
