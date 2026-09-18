// e2e helpers for feature-flag-manager.
//
// Auth via the public signup form (POST /api/users) so each test gets a
// fresh isolated user. The dashboard's first authenticated load triggers
// /api/seed which idempotently populates 3 envs, 3 flags, and 2 segments.

import { type Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3140')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4140') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'pennant'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface Credentials {
  email: string
  password: string
}

/**
 * Sign up via the UI; returns the credentials. App lands on /dashboard.
 *
 * Hardening: gate on submit-enabled, arm the POST /api/users response
 * listener BEFORE the click, then poll until the JWT lands in
 * localStorage. Eliminates a race where the auth-state hook persisted
 * the token in a microtask AFTER React routed off /signup, so an
 * immediate authed `apiFetch` 401-ed.
 */
export async function signup(page: Page, opts: Partial<Credentials> = {}): Promise<Credentials> {
  const email = opts.email ?? uniqueEmail()
  const password = opts.password ?? 'TestPass1234!'
  await page.goto(APP_BASE + '/signup')
  await page.locator('#signup-email').fill(email)
  await page.locator('#signup-password').fill(password)
  const submit = page.getByRole('button', { name: /create workspace/i })
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

/** Login via the UI. */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  const submit = page.getByRole('button', { name: /^sign in$/i })
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

/** Capture network responses during a block. */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number }>> {
  const reqs: Array<{ method: string; url: string; status: number }> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onResp = (resp: any) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
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

/** Issue an API call with a stored auth bearer token. */
export async function apiFetch(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: unknown }> {
  const token = await getAccessToken(page)
  const url = path.startsWith('http') ? path : API_BASE + path
  // Playwright's APIRequestContext.fetch uses `data` (not `body`) to send a
  // JSON-serialisable payload; passing `body` silently sends nothing and
  // the server sees an empty body, which makes `req.body` undefined.
  const opts: Parameters<Page['request']['fetch']>[1] = {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }
  if (body !== undefined) opts.data = body as Record<string, unknown>
  const resp = await page.request.fetch(url, opts)
  let json: unknown = null
  try {
    json = await resp.json()
  } catch {
    /* not json */
  }
  return { status: resp.status(), json }
}

/**
 * Wait for the dashboard's first POST /api/seed call to finish so demo data
 * (envs, flags, segments) is in the DB before the test interacts.
 */
export async function waitForSeed(page: Page): Promise<void> {
  // The dashboard fires POST /api/seed once when /api/flags returns [].
  // Always re-run it explicitly here to remove first-load races.
  const res = await apiFetch(page, 'POST', '/seed')
  expect(res.status, `seed should respond 200 (got ${res.status})`).toBe(200)
}

// ---------------------------------------------------------------------------
// Live-workspace pickers.
//
// Specs read the flags / environments / segments they drive out of the API
// instead of naming the ones POST /api/seed happens to create: the starter
// workspace is the first thing an app's owner replaces, and a spec that names
// a seeded key fails on a correct app.
// ---------------------------------------------------------------------------

export interface ApiFlag {
  id: string
  key: string
  name: string
  description?: string
  state?: string
  is_enabled: boolean
  environment?: string
  rollout_percentage?: number
}

export async function listFlags(page: Page): Promise<ApiFlag[]> {
  const res = await apiFetch(page, 'GET', '/flags')
  expect(res.status, `GET /flags → ${res.status}`).toBe(200)
  const json = res.json as ApiFlag[] | { flags?: ApiFlag[] }
  const flags = Array.isArray(json) ? json : (json.flags ?? [])
  expect(flags.length, 'workspace has at least one flag').toBeGreaterThan(0)
  return flags
}

/** The row state the flags list renders — mirrors Flags.tsx `shape()`. */
export function stateOf(flag: ApiFlag): 'on' | 'off' | 'killed' | 'scheduled' {
  if (flag.state === 'killed') return 'killed'
  if (flag.state === 'scheduled') return 'scheduled'
  return flag.is_enabled ? 'on' : 'off'
}

const ENV_TONES = ['production', 'staging', 'development', 'custom'] as const
type EnvTone = (typeof ENV_TONES)[number]

/** The env-filter chip a flag falls under — the app coerces anything else to production. */
export function envToneOf(flag: ApiFlag): EnvTone {
  return ENV_TONES.includes(flag.environment as EnvTone)
    ? (flag.environment as EnvTone)
    : 'production'
}

/** Any flag the workspace holds. */
export async function pickFlag(page: Page): Promise<ApiFlag> {
  return (await listFlags(page))[0]
}

/** A flag that is currently on — what the toggle-it-off specs need. */
export async function pickEnabledFlag(page: Page): Promise<ApiFlag> {
  const flag = (await listFlags(page)).find((f) => stateOf(f) === 'on')
  if (!flag) throw new Error('workspace has no enabled flag')
  return flag
}

/**
 * Two flags whose keys do not contain one another, so searching for one must
 * exclude the other.
 */
export async function pickTwoFlags(page: Page): Promise<{ target: ApiFlag; other: ApiFlag }> {
  const flags = await listFlags(page)
  const disjoint = (a: string, b: string) =>
    !a.toLowerCase().includes(b.toLowerCase()) && !b.toLowerCase().includes(a.toLowerCase())
  for (const target of flags) {
    const other = flags.find((f) => f.id !== target.id && disjoint(f.key, target.key))
    if (other) return { target, other }
  }
  throw new Error('workspace needs two flags with distinguishable keys')
}

/** Two flags in different environments, the target's having a filter chip. */
export async function pickTwoEnvironmentFlags(
  page: Page,
): Promise<{ target: ApiFlag; other: ApiFlag }> {
  const flags = await listFlags(page)
  for (const target of flags) {
    if (envToneOf(target) === 'custom') continue
    const other = flags.find((f) => envToneOf(f) !== envToneOf(target))
    if (other) return { target, other }
  }
  throw new Error('workspace needs flags in two different environments')
}

export interface ApiEnvironment {
  id: string
  key: string
  name: string
  sdk_key: string
  client_key: string
}

export async function listEnvironments(page: Page): Promise<ApiEnvironment[]> {
  const res = await apiFetch(page, 'GET', '/environments')
  expect(res.status, `GET /environments → ${res.status}`).toBe(200)
  const envs = (res.json as ApiEnvironment[] | null) ?? []
  expect(envs.length, 'workspace has at least one environment').toBeGreaterThan(0)
  return envs
}

export interface ApiSegment {
  id: string
  key: string
  name: string
  description?: string
  /** JSONB — an array on Postgres, a JSON string on a text-column engine. */
  conditions?: unknown
}

/** A segment's conditions as an array, whichever shape the engine returns. */
export function conditionsOf(segment: Pick<ApiSegment, 'conditions'>): Array<{
  attribute?: string
}> {
  const raw = segment.conditions
  if (Array.isArray(raw)) return raw as Array<{ attribute?: string }>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as Array<{ attribute?: string }>) : []
    } catch {
      return []
    }
  }
  return []
}

export async function listSegments(page: Page): Promise<ApiSegment[]> {
  const res = await apiFetch(page, 'GET', '/segments')
  expect(res.status, `GET /segments → ${res.status}`).toBe(200)
  const segments = (res.json as ApiSegment[] | null) ?? []
  expect(segments.length, 'workspace has at least one segment').toBeGreaterThan(0)
  return segments
}

/** A segment the workspace holds that carries at least one condition. */
export async function pickSegmentWithCondition(page: Page): Promise<ApiSegment> {
  const segment = (await listSegments(page)).find((s) => conditionsOf(s).length > 0)
  if (!segment) throw new Error('workspace has no segment with a condition')
  return segment
}
