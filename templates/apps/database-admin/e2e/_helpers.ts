// E2E helpers — shared across every database-admin spec.
//
// All tests sign up a fresh user, then talk to the app's REST API
// (`API_BASE`) for fixture setup (creating connections, etc.) so the UI
// tests can focus on driving real interactions and asserting on real
// outcomes. Read-after-write helpers proxy through `/api/connections`
// and `/api/queries` to verify persistence.
//
// This module ALSO exports the Playwright `globalSetup` (default export,
// wired in playwright.config.ts) that provisions the demo Postgres — see
// the `globalSetup` function at the bottom. It lives here, in the
// always-present helpers module, so the demo-DB seed travels with the suite
// no matter how the suite reaches an environment (a fresh `mlcl create`
// scaffold or a CI/fleet harness that only re-syncs specs + helpers + config).
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { type Page, expect, request as playwrightRequest } from '@molecule/app-e2e-fixtures-default'

const HERE = dirname(fileURLToPath(import.meta.url))

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

// The remote Postgres the e2e suite browses. Provisioned by
// `app/scripts/setup-demo-db.sh` (idempotent).
export const DEMO_HOST = process.env.DEMO_HOST || 'localhost'
export const DEMO_PORT = Number(process.env.DEMO_PORT || 5432)
export const DEMO_DB = process.env.DEMO_DB || 'qadmin_demo'
export const DEMO_USER = process.env.DEMO_USER || 'molecule'
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'molecule'

let counter = 0
export function uniqueEmail(prefix = 'qadmin') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Drive the `/signup` page UI to create a fresh user; lands on
 * `/connections`. Returns credentials so subsequent steps can re-login.
 *
 * Deterministic gating eliminates an auth-race: arm POST /api/users
 * BEFORE the click (so a fast response can't be missed), assert < 400,
 * wait for nav to /connections, then poll until the JWT is readable
 * from localStorage. Without this, specs that immediately fire
 * createDemoConnection() (which calls getAccessToken()) sometimes read
 * a stale empty token (React routes the moment POST resolves but the
 * auth-state hook persists the JWT in a subsequent microtask → empty
 * token assertion blows up → "flaky"). getAccessToken() asserts the
 * token is present, so we need to wait until it actually is.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
): Promise<{ email: string; password: string }> {
  await page.goto(APP_BASE + '/signup')
  await page.getByRole('textbox', { name: /full name/i }).fill('QA Tester')
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByRole('textbox', { name: /^password$/i }).fill(password)
  await page.getByRole('textbox', { name: /confirm password/i }).fill(password)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/connections/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

/** Drive the `/login` page; lands on `/connections`. */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByRole('textbox', { name: /password/i }).fill(password)
  const submit = page.getByRole('button', { name: /sign in/i })
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20_000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/** API-driven signup so non-UI tests can skip the form. */
export async function signupApi(
  email = uniqueEmail(),
  password = 'TestPass123!',
): Promise<{ email: string; password: string; accessToken: string; userId: string }> {
  const ctx = await playwrightRequest.newContext()
  const res = await ctx.post(API_BASE + '/users', {
    headers: { 'content-type': 'application/json' },
    data: { name: 'QA Tester', email, password },
  })
  const body = (await res.json()) as { accessToken: string; props: { id: string } }
  await ctx.dispose()
  return { email, password, accessToken: body.accessToken, userId: body.props.id }
}

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

/**
 * Create a connection straight against the API for tests that just need a
 * working connection without driving the form.
 */
export async function createDemoConnection(
  accessToken: string,
  name = 'Demo',
): Promise<{ id: string }> {
  const ctx = await playwrightRequest.newContext()
  const res = await ctx.post(API_BASE + '/connections', {
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    data: {
      name,
      host: DEMO_HOST,
      port: DEMO_PORT,
      database_name: DEMO_DB,
      username: DEMO_USER,
      password: DEMO_PASSWORD,
      driver: 'postgresql',
      ssl: false,
    },
  })
  expect(res.status()).toBe(201)
  const body = (await res.json()) as { id: string }
  await ctx.dispose()
  return body
}

/** Capture all network responses during a block. */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: {
    request: () => { method: () => string }
    url: () => string
    status: () => number
  }) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp as never)
  try {
    await fn()
  } finally {
    page.off('response', onResp as never)
  }
  return reqs
}

/**
 * Playwright global setup — provision the demo Postgres the e2e suite browses.
 *
 * WHY THIS EXISTS: the schema/query/table/monitoring/connection-test specs
 * connect to a REAL remote Postgres (`qadmin_demo` with seeded `products` /
 * `orders` tables) — that is the whole point of a database admin tool, so those
 * assertions are deliberately end-to-end and must NOT be weakened. The demo DB
 * is provisioned by `app/scripts/setup-demo-db.sh` (idempotent), which a
 * developer running `mlcl create` invokes once by hand. But CI / the fleet
 * harness only starts the app's own platform DB + dev server; nothing runs the
 * seed, so `qadmin_demo` never exists and every probe fails with
 * `database "qadmin_demo" does not exist`. Seeding here (before any spec runs,
 * against whatever the `DEMO_*` env vars point at — defaults match the molecule
 * docker-compose box at localhost:5432, user/pass molecule/molecule) makes the
 * suite self-sufficient in every environment.
 *
 * The seed script handles both a local `psql` and the `molecule-dev-db-1`
 * docker container, so this works in dev and CI with zero extra config.
 */
export default function globalSetup(): void {
  // The seed script ships at `app/scripts/setup-demo-db.sh`; this helpers file
  // lives at `app/e2e/_helpers.ts`, so the script is a sibling `../scripts/`
  // away. Fall back to a couple of plausible locations so the setup is robust
  // to where the suite is invoked from.
  const candidates = [
    join(HERE, '..', 'scripts', 'setup-demo-db.sh'),
    join(process.cwd(), 'scripts', 'setup-demo-db.sh'),
    join(process.cwd(), 'app', 'scripts', 'setup-demo-db.sh'),
  ]
  const script = candidates.find((p) => existsSync(p))
  if (!script) {
    // No seed script found — surface loudly rather than letting every
    // DB-dependent spec time out with an opaque "element not found".
    throw new Error(
      `[e2e global-setup] setup-demo-db.sh not found (looked in: ${candidates.join(', ')}). ` +
        `The schema/query/table specs need the seeded qadmin_demo database.`,
    )
  }

  // The seed script reads DEMO_HOST / DEMO_PORT / DEMO_USER / DEMO_PASSWORD /
  // DEMO_DB from the environment (same defaults as the constants above), so
  // just pass the current env through.
  console.log(`[e2e global-setup] seeding demo Postgres via ${script}`)
  try {
    execFileSync('bash', [script], { stdio: 'inherit', env: process.env })
  } catch (error) {
    throw new Error(
      `[e2e global-setup] failed to seed the demo Postgres. The DB-backed specs ` +
        `(schema/query/table/monitoring/connection-test) require a reachable Postgres ` +
        `at ${DEMO_HOST}:${DEMO_PORT} (user ${DEMO_USER}). Underlying error: ${
          error instanceof Error ? error.message : String(error)
        }`,
    )
  }
}
