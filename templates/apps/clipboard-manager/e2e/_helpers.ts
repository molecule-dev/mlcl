// Shared plumbing for clipboard-manager e2e specs. Centralises signup,
// auth-token capture, and CRUD seeders so per-page specs only assert
// behaviour, never fight boilerplate.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3010')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4010') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'cm'): string {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

export interface SignupResult {
  email: string
  password: string
  accessToken: string
  userId: string | null
}

/**
 * Sign up a brand-new user via the live form, then pull the JWT bearer
 * token + user id out of localStorage so test page.request.* calls can
 * authenticate directly against the API.
 */
export async function signup(
  page: Page,
  email: string = uniqueEmail(),
  password: string = 'TestPass!1234',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name').fill('Test User')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.locator('form button[type="submit"]')
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 20_000 })
  await page.waitForURL(/\/clips/, { timeout: 20_000 })

  const accessToken = await getAccessToken(page)
  if (!accessToken) throw new Error('signup did not set auth cookie')
  const meResp = await page.request.get(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const me = meResp.ok() ? ((await meResp.json()) as { props?: { id?: string } }) : null
  const userId = me?.props?.id ?? null
  return { email, password, accessToken, userId }
}

/** Log a previously-signed-up user back in via the live form. */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.locator('form button[type="submit"]')
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
}

/**
 * Capture every network response that fires while `fn` runs. Use to
 * assert the page actually called the API (and what status came back),
 * not just that a button was clicked.
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number }>> {
  const reqs: Array<{ method: string; url: string; status: number }> = []
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

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

export interface CategorySeed {
  id: string
  name: string
  color: string
  icon: string
}

/** Create a category via the public CRUD endpoint. */
export async function seedCategory(
  page: Page,
  accessToken: string,
  overrides: Partial<{ name: string; color: string; icon: string }> = {},
): Promise<CategorySeed> {
  const body = {
    name: overrides.name ?? `Cat ${Date.now()}`,
    color: overrides.color ?? '#3b82f6',
    icon: overrides.icon ?? 'folder',
  }
  const res = await page.request.post(`${API_BASE}/categories`, {
    headers: apiHeaders(accessToken),
    data: body,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const json = (await res.json()) as { id: string; name: string; color: string; icon: string }
  return { id: json.id, name: json.name, color: json.color, icon: json.icon }
}

export interface ClipSeed {
  id: string
  title: string
  content: string
  is_pinned: boolean
  is_favorite: boolean
  is_sensitive: boolean
}

/** Create a clip via the public CRUD endpoint. */
export async function seedClip(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    content: string
    type: 'text' | 'code' | 'link' | 'image'
    title: string
    category_id: string | null
    is_sensitive: boolean
  }> = {},
): Promise<ClipSeed> {
  const body = {
    content: overrides.content ?? `Clip ${Date.now()}`,
    type: overrides.type ?? 'text',
    title: overrides.title,
    category_id: overrides.category_id,
    is_sensitive: overrides.is_sensitive ?? false,
  }
  const res = await page.request.post(`${API_BASE}/clips`, {
    headers: apiHeaders(accessToken),
    data: body,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const json = (await res.json()) as ClipSeed
  return json
}

export const TEST_PASSWORD = 'TestPass!1234'
