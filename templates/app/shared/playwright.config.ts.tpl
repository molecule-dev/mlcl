import { existsSync } from 'node:fs'

import { defineConfig, devices } from '@playwright/test'

import { e2eRunnerDefaults, resolveE2EProviderName } from '@molecule/app-e2e'

// Inside a molecule sandbox (the marker the platform writes) the app is served on
// 5173; elsewhere Vite's scaffolded 3000. Set on process.env so the spec workers
// and the e2e helpers, which read VITE_PORT themselves, see the same port.
process.env.VITE_PORT ||= existsSync('/etc/mol/app-root') ? '5173' : '3000'
const VITE_PORT = process.env.VITE_PORT

/**
 * `npm run test:e2e` runs the specs in `e2e/`.
 *
 * They run on a real browser through `@molecule/app-e2e-playwright` — inside a
 * molecule sandbox on the Chromium the sandbox ships, against this app's own
 * dev server on `localhost`, with no IDE tab involved; on your machine and in
 * CI after `npx playwright install chromium` once. `MOL_E2E_PROVIDER=preview`
 * drives the live preview the IDE is showing instead (`@molecule/app-e2e-preview`
 * — `baseURL` is ignored there because the preview page's own origin is used,
 * and it fails fast when no tab is attached). See `e2e/bonds.ts`.
 *
 * Workers, parallelism, retries, the failure cap and the per-test timeout come
 * from `e2eRunnerDefaults()` (@molecule/app-e2e), spread first so a field set
 * below it wins. Inside a sandbox that means no retries, a stop after 8
 * failures and 30 s per test; on a real browser the tests run in parallel on
 * half the machine's cores, so the suite costs roughly its slowest file; over
 * the preview there is one page, so one worker. A test that genuinely runs long
 * says so itself (`test.slow()`), rather than raising the timeout for all.
 *
 * Run the WHOLE suite — `npm run test:e2e`. A file per command pays the runner
 * startup again each time.
 * Narrow it only when you mean to: `npm run test:e2e -- e2e/home.spec.ts` (a
 * list of files is also one process), or `npm run test:e2e:changed`, which
 * runs the spec files that differ from HEAD, plus any spec that IMPORTS a
 * changed file. It does NOT see edits to app source no spec imports, and it
 * prints `Total: 0 tests in 0 files` when nothing matched — read that line,
 * because a run that selects nothing still exits 0.
 */
// Which bond runs the specs is @molecule/app-e2e's one rule (MOL_E2E_PROVIDER, else the
// environment).
const preview = resolveE2EProviderName() === 'preview'

export default defineConfig({
  ...e2eRunnerDefaults(),
  testDir: './e2e',
  // Fails in seconds when nothing answers at the target (see e2e/global-setup.ts).
  globalSetup: './e2e/global-setup.ts',
  testMatch: /.*\.spec\.ts$/,
  reporter: [['list']],
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
