// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3220')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4220') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Sign up a fresh user; returns the credentials.
 *
 *  Hardened against an auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit so a fast response can't be missed, assert it
 *  returned 2xx, then wait for navigation off /signup. Without these
 *  gates the auth-state hook (which persists the session) could still
 *  be pending when a follow-up API call read it → 401 flakes. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/^password$/i)
    .first()
    .fill(password)
  const confirm = page.getByLabel(/confirm.*password|password.*confirm/i).first()
  if (await confirm.count().catch(() => 0)) await confirm.fill(password)
  const terms = page.getByRole('checkbox', { name: /terms|agree/i }).first()
  if (await terms.count().catch(() => 0)) await terms.check()
  const submit = page
    .getByRole('button', { name: /sign\s*up|create.*account|register|get\s*started/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  return { email, password }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/password/i)
    .first()
    .fill(password)
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

export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /account|menu|profile|user/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/**
 * Click an "Add … to cart" button and wait for the POST /api/cart/items
 * response. Pre-registers the response listener BEFORE clicking so fast
 * responses don't race past the wait. Default timeout 15s.
 */
export async function addFirstProductToCart(
  page: Page,
  options: { timeout?: number } = {},
): Promise<{ status: number }> {
  const timeout = options.timeout ?? 15_000
  const addBtn = page.getByRole('button', { name: /add.*to cart/i }).first()
  await expect(addBtn).toBeVisible({ timeout })
  const respP = page.waitForResponse(
    (r) => r.url().includes('/api/cart/items') && r.request().method() === 'POST',
    { timeout },
  )
  await addBtn.click()
  const resp = await respP
  return { status: resp.status() }
}

/**
 * On /shop, find the first in-stock product card (= one that exposes an
 * "Add … to cart" chip in FeaturedProductsGrid) and return its
 * /product/:id href. Throws if no in-stock product is rendered.
 */
export async function firstInStockProductHref(page: Page): Promise<string> {
  const addBtn = page.getByRole('button', { name: /add.*to cart/i }).first()
  await expect(addBtn).toBeVisible({ timeout: 15_000 })
  // The card markup wraps a product `<a href="/product/:id">…</a>` and a
  // sibling `<button aria-label="Add … to cart">`. Walk up to the card
  // wrapper, then find the anchor inside it.
  const href = await addBtn.evaluate((el) => {
    const card = el.closest('div.group, article, [class*="group"]') ?? el.parentElement
    const anchor = card?.querySelector('a[href^="/product/"]') as HTMLAnchorElement | null
    return anchor?.getAttribute('href') ?? null
  })
  if (!href) throw new Error('Could not resolve in-stock product href from /shop')
  return href
}

/**
 * Sign up, navigate to /shop, and add the first product to cart.
 * Returns the user's credentials for later use.
 */
export async function signupAndAddToCart(page: Page): Promise<{ email: string; password: string }> {
  const creds = await signup(page)
  await page.goto(APP_BASE + '/shop')
  await page.waitForResponse((r) => r.url().includes('/api/products'), { timeout: 15_000 })
  await addFirstProductToCart(page)
  return creds
}

/**
 * Sign up, add first product to cart, place an order via /checkout.
 * Returns the order id from the confirmation URL. Pre-registers all
 * waitForResponse listeners BEFORE the click that triggers each call.
 */
export async function signupAndPlaceOrder(page: Page): Promise<string> {
  await signupAndAddToCart(page)
  await page.goto(APP_BASE + '/checkout')
  await page.waitForResponse((r) => /\/api\/cart/.test(r.url()), { timeout: 15_000 })
  await page.waitForResponse((r) => /\/api\/delivery-slots/.test(r.url()), { timeout: 15_000 })
  const placeBtn = page.getByRole('button', { name: /place order/i })
  await expect(placeBtn).toBeVisible({ timeout: 10_000 })
  const postP = page.waitForResponse(
    (r) => /\/api\/orders/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 15_000 },
  )
  await placeBtn.click()
  await postP
  await page.waitForURL(/\/order\/[^/]+\/confirmation/, { timeout: 15_000 })
  return page.url().match(/\/order\/([^/]+)/)![1]
}

/** Capture all network responses during a block; mocked-only tests will
 *  return empty. Useful for asserting the app actually called the API. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
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

/** Fail the test if any console.error fires during fn (allowing benign
 *  third-party noise like favicon 404s). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: any) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}
