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
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: preview ? 0 : 2,
  // 'list' for console output; the replay reporter writes the per-app
  // chapter video + actions.json + viewer to .app-screenshots/replays/<slug>/.
  reporter:
    !preview && existsSync(`${WORKSPACE_ROOT}/scripts/replay/reporter.mjs`)
      ? [['list'], [`${WORKSPACE_ROOT}/scripts/replay/reporter.mjs`]]
      : [['list']],
  use: {
    baseURL: process.env.BASE_URL,
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
    actionTimeout: 12_000,
    navigationTimeout: 30_000,
  },
  metadata: {
    apiBase: `${process.env.API_URL}/api`,
  },
})
