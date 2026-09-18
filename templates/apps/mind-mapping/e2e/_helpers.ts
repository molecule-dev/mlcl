// E2E helpers for mind-mapping. Drives JWT auth and seeding via the
// page.request bearer so spec assertions can read after writes.

import { expect, type Page } from '@molecule/app-e2e-fixtures-default'

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
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3280')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4280') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'mm') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/**
 * Hardened against an auth-race: arm POST /api/users response listener
 * BEFORE clicking submit, assert 2xx, wait for navigation to /dashboard,
 * then poll until the httpOnly `token` cookie lands. Without these gates the
 * access-token read sometimes ran before the auth-state hook set the cookie
 * → throws "did not persist an access token" intermittently.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#signup-name').fill('Test User')
  await page.locator('input#signup-email').fill(email)
  await page.locator('input#signup-password').fill(password)
  const submit = page.locator('form button[type="submit"]')
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
  if (!accessToken) throw new Error('signup did not persist an access token')
  const meRes = await page.request.get(API_BASE + '/users/me')
  const meBody = meRes.ok()
    ? ((await meRes.json()) as { props?: { id?: string }; id?: string })
    : null
  const userId = meBody?.props?.id ?? meBody?.id ?? null
  return { email, password, accessToken: accessToken as string, userId }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#login-email').fill(email)
  await page.locator('input#login-password').fill(password)
  const submit = page.locator('form button[type="submit"]')
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
  const onResp = (resp: import('@playwright/test').Response) => {
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

export interface SeededMap {
  id: string
  title: string
}

export async function seedMap(
  page: Page,
  accessToken: string,
  title = `Spec map ${Date.now()}-${++counter}`,
): Promise<SeededMap> {
  const res = await page.request.post(`${API_BASE}/maps`, {
    headers: apiHeaders(accessToken),
    data: { title },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as SeededMap
}

export async function seedNode(
  page: Page,
  accessToken: string,
  mapId: string,
  text = 'Seed node',
  x = 100,
  y = 100,
): Promise<{ id: string; x: number; y: number; text: string }> {
  const res = await page.request.post(`${API_BASE}/nodes`, {
    headers: apiHeaders(accessToken),
    data: { map_id: mapId, text, x, y, color: '#2563eb' },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as { id: string; x: number; y: number; text: string }
}

export async function listMaps(page: Page, accessToken: string) {
  const res = await page.request.get(`${API_BASE}/maps`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as Array<{
    id: string
    title: string
    trashed_at: string | null
    is_public: boolean
  }>
}
