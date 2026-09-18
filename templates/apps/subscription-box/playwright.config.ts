import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { defineConfig } from '@playwright/test'

const VITE_PORT = process.env.VITE_PORT || '3090'

const WORKSPACE_ROOT = process.env.REPLAY_WORKSPACE_ROOT || findReporterRoot()

// Walk up from this config looking for a workspace that ships the replay
// reporter (dev/CI). User projects won't have one — the plain list reporter
// is used there.
function findReporterRoot(): string {
  let dir: string | null = import.meta.dirname
  for (let i = 0; dir && i < 7; i++) {
    if (existsSync(join(dir, 'scripts/replay/reporter.mjs'))) return dir
    dir = dirname(dir)
  }
  return process.cwd()
}

// Against the preview a failed test is a failed test: the page is real, a retry only
// replays the same result and multiplies the run time.
// The live preview drives the specs inside a molecule sandbox (the marker the scaffold
// writes); MOL_E2E_PROVIDER overrides. Same rule as @molecule/app-e2e's resolveE2EProviderName().
const preview =
  process.env.MOL_E2E_PROVIDER === 'preview' ||
  (!process.env.MOL_E2E_PROVIDER && existsSync('/etc/mol/app-root'))

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  // One auto-retry shrugs off transient network-idle / disk-pressure
  // flakes (e.g. ENOSPC mid-trace-write when the host is under load).
  // Tests are otherwise deterministic — captureNetwork has its own
  // network-idle wait and waitForResponse-based predicates.
  retries: preview ? 0 : 2,
  // 'list' for console output; the replay reporter writes the per-app
  // chapter video + actions.json + viewer to .app-screenshots/replays/<slug>/.
  reporter:
    !preview && existsSync(`${WORKSPACE_ROOT}/scripts/replay/reporter.mjs`)
      ? [['list'], [`${WORKSPACE_ROOT}/scripts/replay/reporter.mjs`]]
      : [['list']],
  use: {
    baseURL: `http://localhost:${VITE_PORT}`,
    headless: true,
    // Local + CI: both 'on' so the replay reporter has video + trace for every
    // test; it extracts the action log from each trace.zip (~5 KB) and discards
    // the DOM-snapshot bulk, so the on-disk cost is ~300 KB video + ~5-50 KB
    // actions.json per test.
    // Preview: off. Nothing can record there — the page comes from the bonded
    // provider, so Playwright creates no browser context — and page.screenshot()
    // throws outright (@molecule/app-e2e-preview).
    video: preview ? 'off' : { mode: 'on' },
    trace: preview ? 'off' : 'on',
    screenshot: preview ? 'off' : 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
})
