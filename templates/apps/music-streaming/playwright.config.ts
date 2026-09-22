/**
 * Playwright config for music-streaming E2E.
 *
 * Specs were authored against `process.env.BASE_URL` (Vite app) and
 * `process.env.API_URL` (Express api) — the new orchestrator passes
 * `VITE_PORT`/`API_PORT` instead, so we map them here so the existing
 * spec env-reads keep working.
 *
 * We also load the smoke-app's `../api/.env` so DATABASE_URL is in scope
 * for the e2e helpers that talk to Postgres directly (resetDb, withDb).
 * The smoke-app's actual database name is whatever the API was migrated
 * against; relying on env beats baking in a slug→db convention.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from '@playwright/test'

import { resolveE2EProviderName } from '@molecule/app-e2e'

import { existsSync } from 'node:fs'

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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

const VITE_PORT = process.env.VITE_PORT || '3000'
const API_PORT = process.env.API_PORT || '4000'

if (!process.env.BASE_URL) process.env.BASE_URL = `http://localhost:${VITE_PORT}`
if (!process.env.API_URL) process.env.API_URL = `http://localhost:${API_PORT}`

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
  testMatch: /.*\.spec\.ts$/,
  timeout: 120_000,
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
    baseURL: process.env.BASE_URL,
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
    apiBase: `${process.env.API_URL}/api`,
  },
})
