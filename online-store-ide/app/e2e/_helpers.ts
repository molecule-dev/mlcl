// Test helpers for the online-store template e2e suite. Every spec file
// should import from here rather than rewriting auth / network plumbing.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'shopper') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Sign up a fresh user via the UI. Returns the credentials.
 *
 * Deterministic gating: arm POST /api/users BEFORE the click (so a
 * fast response can't be missed), assert < 400, wait for nav off
 * /signup, then poll until the JWT lands in localStorage. Without
 * this, specs that immediately fire page.request.* (e.g.
 * addFirstProductToCart() calling POST /cart/items) sometimes read
 * a stale empty token because React routes the moment POST resolves
 * but the auth-state hook persists the JWT in a subsequent microtask
 * → 401 → "API-only" flake. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[name="name"]').fill('Test Shopper')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  const submit = page.locator('button[type="submit"]')
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users\b/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

/**
 * Become the store operator for the current (already-authed) session.
 *
 * The catalogue product writes (POST/PUT/DELETE on /products, image upload,
 * inventory adjust) and the entire /admin router (stats, orders, restock,
 * low-stock, reports, store settings) are gated behind `requireAdmin`, which
 * reads `users.role`. A fresh signup defaults to the non-operator
 * 'customer' role, so those writes 401/403 for a brand-new account. This
 * calls the dev-only `POST /api/_test/promote-admin` endpoint (404 in
 * production; served only when `ENABLE_E2E_TEST_ENDPOINTS=true`, which the
 * harness sets) to elevate the caller's OWN row to `role = 'admin'`. So an
 * operator e2e flow signs up a fresh user and then becomes the operator —
 * exercising the real operator surfaces without weakening the gate for
 * ordinary shoppers. The request rides the page context's auth cookie, with
 * the bearer token passed explicitly as a belt-and-suspenders fallback.
 */
export async function promoteToAdmin(page: Page, accessToken?: string | null) {
  const token = accessToken ?? (await getAccessToken(page))
  const res = await page.request.post(API_BASE + '/_test/promote-admin', {
    headers: token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' },
    failOnStatusCode: false,
  })
  expect(res.status(), `POST /api/_test/promote-admin → ${res.status()}`).toBeLessThan(400)
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  const submit = page.locator('button[type="submit"]')
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/** Pick the first product from the seeded storefront and add it to the
 *  signed-in user's cart via the API. Returns the API cart contents. */
export async function addFirstProductToCart(page: Page, quantity = 1) {
  const list = await page.request.get(API_BASE + '/products?limit=5').then((r) => r.json())
  const items = list?.data ?? list?.products ?? list ?? []
  const product = Array.isArray(items) && items.length ? items[0] : null
  if (!product) throw new Error('no products available from /api/products')
  const addResp = await page.request.post(API_BASE + '/cart/items', {
    data: { productId: product.id, quantity },
  })
  if (![200, 201].includes(addResp.status())) {
    throw new Error(`POST /cart/items failed: ${addResp.status()} ${await addResp.text()}`)
  }
  const cart = await page.request.get(API_BASE + '/cart').then((r) => r.json())
  return { product, cart }
}

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
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
