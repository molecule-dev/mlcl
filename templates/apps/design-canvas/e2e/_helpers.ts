// E2E helpers for design-canvas. Imports drive auth, network capture, and
// per-resource seeding via the JWT-bearer auth so page.request.* works.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3050')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4050') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'dc') {
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

/** Sign up a fresh user and land on /dashboard. Returns the credentials
 *  AND the JWT bearer token from the httpOnly cookie set by the auth server
 *  so callers can authenticate page.request.* calls (which use a
 *  separate cookie jar than the live browser).
 *
 *  Hardened against an auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit, assert 2xx, wait for navigation to /dashboard,
 *  then poll the auth cookie until the access token actually lands. Without
 *  these gates the access-token read sometimes ran before the auth-state
 *  hook persisted the token → throws "did not persist an access token"
 *  intermittently. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#signup-first-name').fill('Test')
  await page.locator('input#signup-last-name').fill('User')
  await page.locator('input#signup-email').fill(email)
  await page.locator('input#signup-password').fill(password)
  await page.locator('input#signup-confirm').fill(password)
  const submit = page.locator('form[data-mol-id="signup-form"] button[type="submit"]')
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const userRes = await page.request.get(API_BASE + '/users/me')
  const userBody = (await userRes.json()) as { props?: { id?: string }; id?: string }
  const userId = userBody.props?.id ?? userBody.id ?? null
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken ?? '', userId }
}

/** Log in an existing user via the UI form. Same hardening as signup(). */
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

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

export async function expectNoConsoleErrors(page: Page) {
  // Attach as early as possible — caller invokes once after page.goto().
  // Captures any uncaught error after the call site.
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return errors
}

export async function seedProject(
  page: Page,
  accessToken: string,
  name: string = `Spec project ${Date.now()}`,
) {
  const res = await page.request.post(`${API_BASE}/projects`, {
    headers: apiHeaders(accessToken),
    data: { name },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; name: string }
  return body
}

export async function seedShape(
  page: Page,
  accessToken: string,
  projectId: string,
  type: 'rect' | 'ellipse' | 'text' | 'line' = 'rect',
) {
  const res = await page.request.post(`${API_BASE}/shapes`, {
    headers: apiHeaders(accessToken),
    data: {
      projectId,
      type,
      x: 50,
      y: 50,
      width: 120,
      height: 80,
      fill: '#7c3aed',
      ...(type === 'text' ? { text: 'Spec text' } : {}),
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string }
  return body
}
