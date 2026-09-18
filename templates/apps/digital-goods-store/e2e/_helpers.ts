// Shared helpers for digital-goods-store e2e suite.
//
// All specs import from this file rather than re-rolling auth + network
// plumbing. Auth is real (POST /api/users + Bearer token), backend is the
// real Express + Postgres + Stripe stack on $API_PORT, and the frontend
// at $VITE_PORT proxies /api → $API_PORT via vite.config.ts. No mocks.

import { Page, expect, type APIRequestContext } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'trove') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
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

/**
 * Sign up a fresh user via the UI form. Drives the real /signup page so
 * the test exercises the same flow a human user takes.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Trove Tester',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // Trove's Signup splits name into first/last; flagship convention.
  const firstName = page.locator('#first-name, #signup-first-name')
  const lastName = page.locator('#last-name, #signup-last-name')
  const single = page.locator('#name, #signup-name')
  if (await firstName.count().catch(() => 0)) {
    const [given = name, family = ''] = name.split(/\s+/)
    await firstName.fill(given)
    if (await lastName.count().catch(() => 0)) await lastName.fill(family || 'Tester')
  } else if (await single.count().catch(() => 0)) {
    await single.fill(name)
  }
  // Email/password ids vary by template; try id=email then signup-email.
  const emailField = page.locator('#signup-email, #email')
  await emailField.first().fill(email)
  const pwField = page.locator('#signup-password, #password')
  await pwField.first().fill(password)
  const confirmField = page.locator('#signup-confirm, #confirm-password')
  if (await confirmField.count().catch(() => 0)) await confirmField.first().fill(password)
  const submit = page
    .getByRole('button', {
      name: /create.*(account|store|shop)|start selling|sign\s*up|register|get\s*started/i,
    })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  // Hardening: arm POST listener BEFORE click + poll for token AFTER nav.
  // Auth-state hook persists JWT in a microtask after React routes — a
  // naive nav-wait races subsequent api() calls. See virtual-classroom.
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
    userId = body?.user?.id ?? body?.props?.id ?? body?.id
  } catch {
    /* non-JSON body — fall through to the cookie */
  }
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  // Poll until the httpOnly `token` cookie lands.
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  if (!accessToken) accessToken = (await getAccessToken(page)) ?? undefined
  return { email, password, name, accessToken, userId }
}

/**
 * Direct-to-API signup (no browser). Used inside helpers that need a
 * fresh user but do not want to navigate the UI yet.
 */
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
    userId: body?.props?.id ?? body?.id,
    accessToken: body?.accessToken,
  }
}

/**
 * Log in via the UI. Rarely needed — tests typically call signup() and
 * then continue. Use only for sessions / token rotation tests.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|enter\s*trove|log\s*in/i }).first()
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
  // [M1-1] Poll the httpOnly `token` cookie rather than localStorage.
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/**
 * Capture all responses fired during fn() — used to assert which network
 * calls actually happened (and their statuses).
 */
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

/** Filter captured requests to those that hit /api/<path> (any verb). */
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

/**
 * Make an authenticated direct-to-API request with the captured Bearer
 * token. Use to verify backend invariants (read-after-write).
 */
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
 * Seed a product owned by the signed-in creator, an additional buyer
 * user, a completed Stripe-simulated purchase + license + download log
 * row. Returns the full IDs so tests can navigate to the polished
 * dashboard / sales / library pages and assert the data renders.
 */
export async function seedSale(
  request: APIRequestContext,
  creatorToken: string,
  opts: { productName?: string; priceCents?: number } = {},
) {
  const creator = await authedApi(request, creatorToken)
  const productName = opts.productName ?? `Test Pack ${Date.now()}-${counter++}`
  const productPrice = opts.priceCents ?? 1500
  const productRes = await creator.post('/products', {
    name: productName,
    description: 'Auto-generated for e2e',
    price_cents: productPrice,
    category: 'UI Kits',
    file_type: 'ZIP',
    cover_image: 'https://picsum.photos/seed/test/800/500',
    tags: ['ui', 'figma'],
  })
  expect(productRes.status(), 'seed product POST').toBeLessThan(400)
  const product = await productRes.json()

  const buyer = await apiSignup(request)
  const buyerApi = await authedApi(request, buyer.accessToken!)
  const sessionRes = await buyerApi.post('/checkout/create-session', { productId: product.id })
  expect(sessionRes.status(), 'create-session').toBeLessThan(400)
  const session = await sessionRes.json()
  expect(session.sessionId, 'sessionId from create-session').toBeTruthy()

  const simulateRes = await buyerApi.post('/checkout/simulate', { sessionId: session.sessionId })
  expect(simulateRes.status(), 'checkout/simulate').toBeLessThan(400)
  const simulated = await simulateRes.json()

  return {
    product,
    buyer,
    purchase: {
      id: simulated.purchaseId as string,
      licenseKey: simulated.licenseKey as string,
      sessionId: session.sessionId as string,
    },
  }
}

/** Fail the test if any console.error fires during fn — modulo benign noise. */
export async function expectNoFatalConsoleErrors(page: Page, fn: () => Promise<void>) {
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
