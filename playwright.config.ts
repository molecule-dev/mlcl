import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'src/lib/__tests__/visual',
  outputDir: '.playwright-results',
  snapshotDir: 'src/lib/__tests__/visual/snapshots',
  timeout: 60_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    viewport: { width: 1280, height: 720 },
    colorScheme: 'dark',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
