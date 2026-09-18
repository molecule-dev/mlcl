/**
 * Shared helpers for the meeting-scheduler e2e suite.
 *
 * Real auth (POST /api/users + Bearer JWT), real Postgres-backed API on
 * $API_PORT, real frontend at $VITE_PORT proxying /api -> $API_PORT.
 * No mocks. Tests prove backend invariants by reading-after-write.
 */

import { Page, expect, type APIRequestContext } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3080')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4080') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'meridian') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export function uniqueSlug(prefix = 'slot') {
  return `${prefix}-${Date.now()}-${++counter}`
}

export interface SignupResult {
  email: string
  password: string
  name: string
  userId?: string
  accessToken?: string
}

/**
 * Read the bearer JWT from the auth cookie. [M1-1] The token is held in
 * memory + an httpOnly `token` cookie (prod: `__Host-token`); it is no
 * longer persisted to localStorage (that copy was XSS-exfiltratable). The
 * cookie value IS the JWT and is readable in tests via the Playwright
 * context.
 */
export async function getAccessToken(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Avery Liu',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('#signup-email').fill(email)
  await page.locator('#signup-password').fill(password)
  const nameField = page.locator('#signup-name')
  if (await nameField.count().catch(() => 0)) await nameField.fill(name)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  // [M1-1] The JWT is no longer in localStorage. Capture it from the
  // create+logIn response body — the @molecule/api-resource-user create
  // handler returns `{ props, accessToken, user }` — falling back to the
  // httpOnly `token` cookie.
  let accessToken: string | undefined
  let userId: string | undefined
  try {
    const body = await resp.json()
    accessToken = body?.accessToken
    userId = body?.id ?? body?.props?.id ?? body?.user?.id
  } catch {
    /* non-JSON body — fall through to the cookie */
  }
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  if (!accessToken) accessToken = (await getAccessToken(page)) ?? undefined
  return { email, password, name, accessToken, userId }
}

export async function apiSignup(request: APIRequestContext): Promise<SignupResult> {
  const email = uniqueEmail('apionly')
  const password = 'TestPass123!'
  const name = 'API Tester'
  const res = await request.post(API_BASE + '/users', {
    data: { email, password, name },
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status(), 'apiSignup failed').toBe(201)
  const body = await res.json()
  return {
    email,
    password,
    name,
    userId: body?.id ?? body?.props?.id ?? body?.user?.id,
    accessToken: body?.accessToken,
  }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('#email').first().fill(email)
  await page.locator('#password').first().fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
}

export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: { request(): { method(): string }; url(): string; status(): number }) => {
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

export function whereUrl(
  reqs: ReadonlyArray<{ method: string; url: string; status: number }>,
  pathRegex: RegExp,
  method?: string,
) {
  return reqs.filter(
    (r) =>
      pathRegex.test(r.url) && (method ? r.method.toUpperCase() === method.toUpperCase() : true),
  )
}

export async function authedApi(request: APIRequestContext, token: string) {
  return {
    get: (path: string) =>
      request.get(API_BASE + path, { headers: { Authorization: `Bearer ${token}` } }),
    post: (path: string, body: unknown) =>
      request.post(API_BASE + path, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: body,
      }),
    patch: (path: string, body: unknown) =>
      request.patch(API_BASE + path, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: body,
      }),
    put: (path: string, body: unknown) =>
      request.put(API_BASE + path, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: body,
      }),
    delete: (path: string) =>
      request.delete(API_BASE + path, { headers: { Authorization: `Bearer ${token}` } }),
  }
}

/**
 * Seed a host with its own event type plus business-hours
 * availability (Mon-Fri 09:00-17:00 UTC). Returns the slug + id so tests
 * can navigate to /book/<slug>.
 */
export async function seedHostWithEventType(
  request: APIRequestContext,
  options: { slug?: string; durationMinutes?: number } = {},
): Promise<{ host: SignupResult; eventTypeId: string; slug: string }> {
  const host = await apiSignup(request)
  const api = await authedApi(request, host.accessToken!)
  const slug = options.slug ?? uniqueSlug('discovery')
  const etRes = await api.post('/event-types', {
    name: 'Discovery call',
    slug,
    duration_minutes: options.durationMinutes ?? 30,
    location_kind: 'jitsi',
    is_active: true,
  })
  expect(etRes.status(), 'POST /event-types').toBeLessThan(400)
  const et = await etRes.json()
  const rules = [1, 2, 3, 4, 5].map((dow) => ({
    day_of_week: dow,
    start_minute: 9 * 60,
    end_minute: 17 * 60,
    timezone: 'UTC',
  }))
  const availRes = await api.put('/availability/bulk', { rules })
  expect(availRes.status(), 'PUT /availability/bulk').toBeLessThan(400)
  return { host, eventTypeId: et.id, slug }
}

/**
 * Find the next Monday (UTC) so we land on a day with availability rules.
 * Returns YYYY-MM-DD.
 */
export function nextMondayISO(): string {
  const d = new Date()
  const dow = d.getUTCDay()
  const daysUntilMon = (8 - dow) % 7 || 7
  d.setUTCDate(d.getUTCDate() + daysUntilMon)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: { type(): string; text(): string }) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler as never)
  try {
    await fn()
  } finally {
    page.off('console', handler as never)
  }
  const fatal = errs.filter(
    (e) =>
      !/favicon|net::ERR_INSUFFICIENT_RESOURCES|Failed to load resource|the server responded with a status of 4\d\d/.test(
        e,
      ),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}
