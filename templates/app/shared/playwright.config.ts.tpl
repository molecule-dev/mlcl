import { existsSync } from 'node:fs'

import { defineConfig, devices } from '@playwright/test'

const VITE_PORT = process.env.VITE_PORT || '3000'

/**
 * `npm run test:e2e` runs the specs in `e2e/`.
 *
 * Inside a molecule sandbox they drive the live preview the IDE is showing
 * (`@molecule/app-e2e-preview` — no browser install, `baseURL` is ignored
 * because the preview page's own origin is used). On your machine and in CI
 * they run on real browsers (`npx playwright install chromium` once). See
 * `e2e/bonds.ts`.
 *
 * Against the preview a failed test is a failed test: the page is real, a
 * retry only replays the same result and multiplies the run time.
 *
 * Run the WHOLE suite — `npm run test:e2e`. `workers: 1` runs every spec file
 * in ONE worker process, so the suite costs one runner startup no matter how
 * many files it holds; a file per command pays that startup again each time.
 * Narrow it only when you mean to: `npm run test:e2e -- e2e/home.spec.ts` (a
 * list of files is also one process), or `npm run test:e2e:changed`, which
 * runs the spec files that differ from HEAD, plus any spec that IMPORTS a
 * changed file. It does NOT see edits to app source no spec imports, and it
 * prints `Total: 0 tests in 0 files` when nothing matched — read that line,
 * because a run that selects nothing still exits 0.
 */
// The live preview drives the specs inside a molecule sandbox (the marker the scaffold
// writes); MOL_E2E_PROVIDER overrides. Same rule as @molecule/app-e2e's resolveE2EProviderName().
const preview =
  process.env.MOL_E2E_PROVIDER === 'preview' ||
  (!process.env.MOL_E2E_PROVIDER && existsSync('/etc/mol/app-root'))

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: preview ? 0 : 1,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.APP_BASE || `http://localhost:${VITE_PORT}`,
    // Nothing can capture over the preview: the page comes from the bonded
    // provider, so Playwright creates no browser context — and page.screenshot()
    // throws outright there (@molecule/app-e2e-preview).
    screenshot: preview ? 'off' : 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
