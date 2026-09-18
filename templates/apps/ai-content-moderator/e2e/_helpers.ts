// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

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
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3070')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4070') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'mod') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/** Sign up a fresh user and land on /dashboard. Returns the credentials
 *  AND the JWT bearer token from the httpOnly cookie set by the auth client
 *  so callers can authenticate page.request.* calls (which use a
 *  separate cookie jar than the live browser). */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#signup-first-name').fill('Test')
  await page.locator('input#signup-last-name').fill('User')
  await page.locator('input#signup-email').fill(email)
  await page.locator('input#signup-password').fill(password)
  await page.locator('input#signup-confirm').fill(password)
  const submit = page.locator('form[data-mol-id="signup-form"] button[type="submit"]')
  await expect(submit).toBeEnabled({ timeout: 10000 })
  // Arm the POST listener BEFORE clicking so a fast response can't be
  // missed. Mirrors the hardening applied to virtual-classroom (b296e327d).
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  // Poll until the auth-state hook has set the httpOnly token cookie —
  // it runs in a microtask after the POST resolves and the router
  // navigates, so a naked read can race the persistence.
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const meResp = await page.request.get(API_BASE + '/users/me')
  let userId: string | null = null
  if (meResp.ok()) {
    const me = (await meResp.json()) as { props?: { id?: string }; id?: string }
    userId = me?.props?.id ?? me?.id ?? null
  }
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
}

/** Log in an existing user via the UI form. */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#login-email').fill(email)
  await page.locator('input#login-password').fill(password)
  const submit = page.locator('form[data-mol-id="login-form"] button[type="submit"]')
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
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/** Capture all network responses during a block. */
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

/** Authed API helpers — use the JWT bearer token from signup() to drive
 *  page.request.* without a real browser session. */
export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

export async function seedQueueItem(
  page: Page,
  accessToken: string,
  preview: string = `Preview ${Date.now()}`,
) {
  const res = await page.request.post(`${API_BASE}/moderation`, {
    headers: apiHeaders(accessToken),
    data: {
      source: 'manual',
      content_type: 'text',
      content_preview: preview,
      language: 'en',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string }
  return { id: body.id, preview }
}

export async function seedRule(
  page: Page,
  accessToken: string,
  name: string = `Rule ${Date.now()}`,
) {
  const res = await page.request.post(`${API_BASE}/rules`, {
    headers: apiHeaders(accessToken),
    data: {
      name,
      kind: 'regex',
      pattern_or_threshold: '\\bspam\\b',
      action: 'auto_reject',
      enabled: true,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string }
  return { id: body.id, name }
}

export async function seedNotification(
  page: Page,
  accessToken: string,
  title: string = `Alert ${Date.now()}`,
) {
  const res = await page.request.post(`${API_BASE}/notifications`, {
    headers: apiHeaders(accessToken),
    data: { kind: 'assignment', title, body: 'Auto-seeded for spec' },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string }
  return { id: body.id, title }
}

export async function seedToken(
  page: Page,
  accessToken: string,
  label: string = `Token ${Date.now()}`,
) {
  const res = await page.request.post(`${API_BASE}/api-tokens`, {
    headers: apiHeaders(accessToken),
    data: { label },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; token: string }
  return { id: body.id, label, token: body.token }
}
