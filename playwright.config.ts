import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'src/lib/__tests__/visual',
  outputDir: '.playwright-results',
  // Starts every framework's showcase once for the run (a beforeAll restarts with each worker).
  globalSetup: './src/lib/__tests__/visual/global-setup.ts',
  // The showcases are shared, so the comparisons can run side by side.
  fullyParallel: true,
  // The expected images are React's screenshots from the same run (cross-framework.spec.ts), so
  // they live with the results and are never stored in the repository.
  snapshotPathTemplate: '.playwright-results/react-baseline/{arg}{ext}',
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
