/**
 * Shared helpers for email-client e2e specs. Drives a real browser
 * against the dev server hitting a real Postgres + Mailgun stub. No
 * mocks — every assertion is "user clicked → backend actually changed".
 */
import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3300')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4300') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'meridian') {
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

/**
 * Sign up a fresh user via the real signup form. Returns the captured
 * access token + user id so specs can issue authenticated API calls
 * directly. After signup the app redirects to /inbox.
 *
 * Hardened against the auth-race: arm POST /api/users response listener
 * BEFORE clicking submit so a fast response can't be missed, gate on
 * status < 400, then wait for navigation and finally poll until the JWT
 * is actually readable from localStorage. Eliminates the API-only flake
 * where a spec fired an authed API call before the auth-state hook had
 * persisted the token.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Test User',
) {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name').fill(name)
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await page.waitForURL(/\/inbox/, { timeout: 30_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
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
  return { email, password, name, accessToken: accessToken as string, userId }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in/i })
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
  await page.waitForURL(/\/inbox/, { timeout: 20_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

/**
 * Capture every HTTP response during a block and return them. Used by
 * specs that must assert real backend calls happened (read-after-write
 * + gate 12 in scripts/verify-app-coverage.mjs).
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: import('@playwright/test').Response) => {
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
    })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

/** GET /api/emails — wraps response coercion for tests. */
export async function listEmails(
  page: Page,
  accessToken: string,
  params: Record<string, string | number | boolean> = {},
): Promise<EmailRow[]> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v))
  const url = `${API_BASE}/emails${qs.toString() ? `?${qs.toString()}` : ''}`
  const res = await page.request.get(url, { headers: apiHeaders(accessToken) })
  expect(res.status(), await res.text()).toBe(200)
  const body = (await res.json()) as { data?: EmailRow[] } | EmailRow[]
  return Array.isArray(body) ? body : (body.data ?? [])
}

/** GET /api/emails/counts */
export async function getCounts(page: Page, accessToken: string): Promise<EmailCounts> {
  const res = await page.request.get(`${API_BASE}/emails/counts`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as EmailCounts
}

export interface EmailRow {
  id: string
  user_id: string
  from?: string | null
  to?: string[] | string | null
  subject: string | null
  body: string | null
  folder: string
  is_read: boolean
  is_starred: boolean
  thread_id?: string | null
  sent_at?: string | null
  created_at: string
}

export interface EmailCounts {
  total: number
  unread: number
  starred: number
  inbox: number
  sent: number
  drafts: number
  trash: number
  spam: number
  archive: number
  [k: string]: number
}
