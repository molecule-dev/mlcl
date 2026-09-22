import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from '@playwright/test'

import { resolveE2EProviderName } from '@molecule/app-e2e'

import { existsSync } from 'node:fs'

// Load the smoke-app's `../api/.env` so e2e tests that need to verify
// against real backend secrets (Mailgun webhook signing key, Stripe
// secret, JWT keys, etc.) can read them from process.env exactly like
// the api itself does. Without this, tests that forge a signed webhook
// payload from the api's MAILGUN_API_KEY would have to be skipped
// because the playwright runner has no access to the API's env.
//
// Existing env vars win — never clobber an explicit override. This is
// the same precedence Node's `--env-file` flag uses.
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const API_ENV_PATH = resolve(__dirname, '../api/.env')
if (existsSync(API_ENV_PATH)) {
  const envText = readFileSync(API_ENV_PATH, 'utf8')
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    // Strip optional surrounding quotes; treat \n in quoted values as
    // real newlines so the JWT private key (multi-line PEM) round-trips.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).replace(/\\n/g, '\n')
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

// Inside a molecule sandbox (the marker the platform writes) the app is served on
// 5173; elsewhere this app's own dev port. Set on process.env so the spec workers
// and the e2e helpers, which read VITE_PORT themselves, see the same port.
process.env.VITE_PORT ||= existsSync('/etc/mol/app-root') ? '5173' : '3000'
const VITE_PORT = process.env.VITE_PORT

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
  timeout: 120_000,
  expect: { timeout: 15_000 },
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
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
})
