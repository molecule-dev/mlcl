// Auction-platform-specific Playwright helpers. Every spec file imports
// from this module rather than rewriting auth/network plumbing per-test.

import { Page, expect, request, APIRequestContext } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Sign up via the API directly, then inject the access token into
 * localStorage and navigate to / (which the app treats as logged-in).
 *
 * Returns the credentials and user id so subsequent flows (bidding,
 * checkout, etc.) can drive the rest of the API alongside the browser.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Test User',
): Promise<{ email: string; password: string; userId: string; accessToken: string }> {
  const res = await page.request.post(`${API_BASE}/users`, {
    data: { name, email, password },
    failOnStatusCode: false,
  })
  if (!res.ok()) {
    throw new Error(`signup failed (${res.status()}): ${await res.text()}`)
  }
  const body = (await res.json()) as { accessToken: string; props?: { id?: string } }
  const accessToken = body.accessToken
  const userId = body.props?.id || ''
  // [M1-1] Token is now an httpOnly cookie set by the server; no
  // localStorage injection needed.
  await page.goto(APP_BASE + '/')
  return { email, password, userId, accessToken }
}

/**
 * Log in via the form (so login submission and redirect logic gets
 * exercised). The user must already exist. Returns when the login
 * page is no longer the URL.
 *
 * Hardening (mirrors virtual-classroom b296e327d): gate submit on
 * enabled, arm POST listener BEFORE click so a fast response can't be
 * missed, assert response succeeded, wait for nav off /login, then poll
 * until the access token is readable from localStorage. signup() in
 * this app is API-direct so doesn't need the same treatment.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/^password$/i)
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
  await expect
    .poll(async () => await getAccessToken(page), {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .not.toBeNull()
}

export async function logout(page: Page) {
  const userMenu = page.getByRole('button', { name: /open user menu|account|user/i }).first()
  if (await userMenu.count().catch(() => 0)) await userMenu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
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
 * Capture every response made by `page` while `fn` runs. Useful for
 * asserting the app actually issued the API calls we expect.
 */
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

/**
 * Auction-platform specific helpers
 */

/** Create a fresh active listing as the given seller. Returns the listing row. */
export async function createListing(
  page: Page,
  token: string,
  overrides: Partial<{
    title: string
    description: string
    category: string
    startingPrice: number
    reservePrice: number
    buyNowPrice: number
    duration: number
  }> = {},
) {
  const body = {
    title: overrides.title ?? `Test lot ${Date.now()}`,
    description: overrides.description ?? 'Test description',
    category: overrides.category ?? 'collectibles',
    startingPrice: overrides.startingPrice ?? 100,
    reservePrice: overrides.reservePrice,
    buyNowPrice: overrides.buyNowPrice,
    duration: overrides.duration ?? 24,
  }
  const res = await page.request.post(`${API_BASE}/listings`, {
    data: body,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  })
  if (!res.ok()) throw new Error(`createListing failed (${res.status()}): ${await res.text()}`)
  return (await res.json()) as Record<string, unknown>
}

/** Place a bid on a listing as the given user. */
export async function placeBid(page: Page, token: string, listingId: string, amount: number) {
  const res = await page.request.post(`${API_BASE}/bids`, {
    data: { listingId, amount },
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  })
  if (!res.ok()) throw new Error(`placeBid failed (${res.status()}): ${await res.text()}`)
  return await res.json()
}

/** Force the auction to end now (test endpoint). */
export async function endNow(page: Page, token: string, listingId: string) {
  const res = await page.request.post(`${API_BASE}/listings/${listingId}/end-now`, {
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  })
  if (!res.ok()) throw new Error(`endNow failed (${res.status()}): ${await res.text()}`)
  return await res.json()
}
