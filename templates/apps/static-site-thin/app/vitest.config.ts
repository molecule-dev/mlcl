import { defineConfig } from 'vitest/config'

// Unit tests only: `src/**/__tests__/*.test.ts`. The browser specs in e2e/
// run under Playwright (`npm run test:e2e`), never here.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
