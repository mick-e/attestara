import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globals: true,
    testTimeout: 60000,
    // Disable file-level parallelism: CLI tests share `@attestara/sdk` module
    // initialization which deadlocks under parallel worker startup on Windows.
    // Tests complete in ~38s serially; the parallelism saving is < the hang risk.
    fileParallelism: false,
  },
})
