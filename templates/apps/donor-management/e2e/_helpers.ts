// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3210')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4210') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'donor') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
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

/** Sign up a fresh user; returns the credentials AND the JWT bearer
 *  token persisted to localStorage by the auth client so callers can
 *  authenticate page.request.* calls.
 *
 *  Hardened against the auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit so a fast response can't be missed, gate on
 *  status < 400, then wait for navigation off /signup, then for the
 *  token to land in localStorage. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name').fill('Test User')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  // Wait for auth cookie to be set before reading it.
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 15000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  let userId: string | null = null
  const meRes = await page.request.get(API_BASE + '/users/me', { failOnStatusCode: false })
  if (meRes.ok()) {
    const meBody = (await meRes.json()) as { props?: { id?: string }; id?: string }
    userId = meBody?.props?.id ?? meBody?.id ?? null
  }
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.getByRole('button', { name: /sign in/i })
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })
}

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: { request(): { method(): string }; url(): string; status(): number }) => {
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

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

/** Wait until the seeded demo data has been written to the user's tenant.
 *  The first GET /api/donors triggers seedDemoForUser, which inserts the
 *  donors, campaigns, gifts, and one receipt. Subsequent reads see the
 *  seeded rows. */
export async function waitForSeed(page: Page, accessToken: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await page.request.get(`${API_BASE}/donors`, {
      headers: apiHeaders(accessToken),
    })
    if (res.status() === 200) {
      const body = (await res.json()) as Array<unknown>
      if (Array.isArray(body) && body.length > 0) return body
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('seed never produced donors')
}

/** Get the first seeded donor id for tests that need an existing record. */
export async function firstDonorId(page: Page, accessToken: string): Promise<string> {
  const res = await page.request.get(`${API_BASE}/donors`, { headers: apiHeaders(accessToken) })
  expect(res.status(), await res.text()).toBe(200)
  const body = (await res.json()) as Array<{ id: string }>
  expect(body.length).toBeGreaterThan(0)
  return body[0]!.id
}

/** Create a donor + one gift in a PAST calendar year through the API —
 *  clean material for the year-end receipt generate flow, independent of
 *  whatever the demo seed happened to receipt. */
export async function createDonorWithPastYearGift(
  page: Page,
  accessToken: string,
): Promise<{ donorId: string; giftId: string; year: number; amountCents: number }> {
  const year = new Date().getFullYear() - 1
  const name = `E2E Receipt Donor ${Date.now() % 100000}`
  const donorRes = await page.request.post(`${API_BASE}/donors`, {
    headers: apiHeaders(accessToken),
    data: { name, email: `receipt+${Date.now() % 100000}@e2e.test`, tags: [] },
  })
  expect(donorRes.status(), await donorRes.text()).toBe(201)
  const donor = (await donorRes.json()) as { id: string }

  const amountCents = 12345
  const giftRes = await page.request.post(`${API_BASE}/gifts`, {
    headers: apiHeaders(accessToken),
    data: {
      donor_id: donor.id,
      amount_cents: amountCents,
      gift_date: `${year}-07-04`,
      method: 'check',
      fund: 'general',
    },
  })
  expect(giftRes.status(), await giftRes.text()).toBe(201)
  const gift = (await giftRes.json()) as { id: string }
  return { donorId: donor.id, giftId: gift.id, year, amountCents }
}
