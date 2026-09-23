import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

import { e2eRunnerDefaults } from '@molecule/app-e2e'

// Inside a molecule sandbox (the marker the platform writes) the app is served on
// 5173; elsewhere this app's own dev port. Set on process.env so the spec workers
// and the e2e helpers, which read VITE_PORT themselves, see the same port.
process.env.VITE_PORT ||= existsSync('/etc/mol/app-root') ? '5173' : '3140'
const VITE_PORT = process.env.VITE_PORT
const APP_BASE = process.env.APP_BASE || `http://localhost:${VITE_PORT}`

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
const sandbox = existsSync('/etc/mol/app-root')

export default defineConfig({
  ...e2eRunnerDefaults(),
  testDir: './e2e',
  // Fails in seconds when nothing answers at the target (see e2e/global-setup.ts).
  globalSetup: './e2e/global-setup.ts',
  testMatch: /.*\.spec\.ts$/,
  // 'list' for console output; the replay reporter writes the per-app
  // chapter video + actions.json + viewer to .app-screenshots/replays/<slug>/.
  reporter:
    !sandbox && existsSync(`${WORKSPACE_ROOT}/scripts/replay/reporter.mjs`)
      ? [['list'], [`${WORKSPACE_ROOT}/scripts/replay/reporter.mjs`]]
      : [['list']],
  expect: { timeout: 10_000 },
  use: {
    // Local + CI: both 'on' so the replay reporter has video + trace for every
    // test; it extracts the action log from each trace.zip (~5 KB) and discards
    // the DOM-snapshot bulk, so the on-disk cost is ~300 KB video + ~5-50 KB
    // actions.json per test.
    // Sandbox: off. Recording costs seconds per test and nothing reads it there.
    // Over the preview bond page.screenshot() throws outright (the page comes from
    // the bonded provider, not a Playwright context), so screenshots stay off there.
    video: sandbox ? 'off' : { mode: 'on' },
    trace: sandbox ? 'off' : 'on',
    baseURL: APP_BASE,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
