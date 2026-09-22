import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { defineConfig } from '@playwright/test'

import { resolveE2EProviderName } from '@molecule/app-e2e'

// Inside a molecule sandbox (the marker the platform writes) the app is served on
// 5173; elsewhere this app's own dev port. Set on process.env so the spec workers
// and the e2e helpers, which read VITE_PORT themselves, see the same port.
process.env.VITE_PORT ||= existsSync('/etc/mol/app-root') ? '5173' : '3000'
const VITE_PORT = process.env.VITE_PORT
const API_PORT = process.env.API_PORT || '4000'

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

// Which bond runs the specs is @molecule/app-e2e's one rule (MOL_E2E_PROVIDER, else the
// environment): the playwright bond — a real browser, baked into every molecule sandbox —
// or, on request, the live preview the IDE is showing. Inside a sandbox (the marker the
// platform writes) the run is the executor's feedback loop: a failed test is a failed test
// and nothing reads the artifacts, so no retries, no video, no trace.
const preview = resolveE2EProviderName() === 'preview'
const sandbox = existsSync('/etc/mol/app-root')

export default defineConfig({
  testDir: './e2e',
  // Fails in seconds when nothing answers at the target (see e2e/global-setup.ts).
  globalSetup: './e2e/global-setup.ts',
  testMatch: /.*\.spec\.ts$/,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: sandbox ? 0 : 2,
  // 'list' for console output; the replay reporter writes the per-app
  // chapter video + actions.json + viewer to .app-screenshots/replays/<slug>/.
  reporter:
    !sandbox && existsSync(`${WORKSPACE_ROOT}/scripts/replay/reporter.mjs`)
      ? [['list'], [`${WORKSPACE_ROOT}/scripts/replay/reporter.mjs`]]
      : [['list']],
  use: {
    baseURL: `http://localhost:${VITE_PORT}`,
    headless: true,
    // Local + CI: both 'on' so the replay reporter has video + trace for every
    // test; it extracts the action log from each trace.zip (~5 KB) and discards
    // the DOM-snapshot bulk, so the on-disk cost is ~300 KB video + ~5-50 KB
    // actions.json per test.
    // Sandbox: off. Recording costs seconds per test and nothing reads it there.
    // Over the preview bond page.screenshot() throws outright (the page comes from
    // the bonded provider, not a Playwright context), so screenshots stay off there.
    video: sandbox ? 'off' : { mode: 'on' },
    trace: sandbox ? 'off' : 'on',
    screenshot: preview ? 'off' : 'only-on-failure',
    actionTimeout: 12_000,
    navigationTimeout: 30_000,
  },
  metadata: {
    apiBase: `http://localhost:${API_PORT}/api`,
  },
})
