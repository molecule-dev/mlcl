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
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3010')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4010') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Sign up a fresh user via the UI; returns the credentials AND the
 *  JWT bearer token from the httpOnly cookie so callers can drive
 *  page.request.* with bearer auth. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('#signup-email').fill(email)
  await page.locator('#signup-password').fill(password)
  const submit = page.getByRole('button', { name: /create\s*account/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 20000 })
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
  return { email, password, accessToken, userId }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('#login-email, input[type="email"]').first().fill(email)
  await page.locator('#login-password, input[type="password"]').first().fill(password)
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
  await page.evaluate(() => window.localStorage.clear())
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
  page.on('response', onResp as Parameters<typeof page.on>[1])
  try {
    await fn()
  } finally {
    page.off('response', onResp as Parameters<typeof page.on>[1])
  }
  return reqs
}

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

/** Helper: create a bot via API for tests that depend on one. */
export async function seedBot(
  page: Page,
  accessToken: string | null,
  overrides: Partial<{
    name: string
    description: string
    welcome_message: string
    system_prompt: string
  }> = {},
): Promise<{ id: string; name: string }> {
  const name = overrides.name ?? `Test Bot ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/bots`, {
    headers: authHeaders(accessToken),
    data: {
      name,
      description: overrides.description ?? 'Seeded for spec',
      welcome_message: overrides.welcome_message ?? 'Hi!',
      system_prompt: overrides.system_prompt ?? 'You answer in one word.',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  const body = (await res.json()) as { id: string }
  return { id: body.id, name }
}

/** Helper: seed a notification for the signed-in user. */
export async function seedNotification(
  page: Page,
  accessToken: string | null,
  title = `Alert ${Date.now()}-${++counter}`,
): Promise<{ id: string; title: string }> {
  const res = await page.request.post(`${API_BASE}/notifications`, {
    headers: authHeaders(accessToken),
    data: { kind: 'system', title, body: 'Auto-seeded for spec' },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(201)
  const body = (await res.json()) as { id: string }
  return { id: body.id, title }
}
