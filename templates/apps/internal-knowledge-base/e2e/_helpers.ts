/**
 * Test helpers for internal-knowledge-base. Auth flows go through the
 * @molecule/api-resource-user backend. The signup form has First/Last
 * name fields rather than a single Name input.
 */

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'ikb') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Signup the user via the form. Returns credentials. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  firstName = 'Test',
  lastName = 'User',
) {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#firstName, input[name="firstName"]').first().fill(firstName)
  await page.locator('input#lastName, input[name="lastName"]').first().fill(lastName)
  await page.locator('input[type="email"], input#email').first().fill(email)
  await page.locator('input#password').first().fill(password)
  await page.locator('input#confirm').first().fill(password)
  const submit = page
    .getByRole('button', { name: /create workspace|create account|sign\s*up|get\s*started/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  // Arm POST listener BEFORE click so a fast response can't be missed.
  // Mirrors virtual-classroom hardening (b296e327d).
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 20_000 })
  // ikb uses cookie-based auth; poll until the auth cookie is set so
  // subsequent apiGet/Post calls (which read the cookie) don't 401.
  await expect
    .poll(async () => await getBearerToken(page), {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .not.toBeNull()
  return { email, password, firstName, lastName }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"], input#email').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  await expect
    .poll(async () => await getBearerToken(page), {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .not.toBeNull()
}

/** Capture all network responses during a block. */
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

/** Read the auth bearer token from the cookie set by the API server. */
export async function getBearerToken(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies()
  return cookies.find((c) => c.name === 'token')?.value ?? null
}

/** Fetch JSON via a logged-in page's session. */
export async function apiGet<T>(
  page: Page,
  path: string,
): Promise<{ status: number; body: T | null }> {
  const token = await getBearerToken(page)
  const resp = await page.request.get(API_BASE + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  let body: T | null = null
  try {
    body = (await resp.json()) as T
  } catch {
    body = null
  }
  return { status: resp.status(), body }
}

export async function apiPost<T>(
  page: Page,
  path: string,
  json: Record<string, unknown>,
): Promise<{ status: number; body: T | null }> {
  const token = await getBearerToken(page)
  const resp = await page.request.post(API_BASE + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data: json,
  })
  let body: T | null = null
  try {
    body = (await resp.json()) as T
  } catch {
    body = null
  }
  return { status: resp.status(), body }
}

export async function apiPatch<T>(
  page: Page,
  path: string,
  json: Record<string, unknown>,
): Promise<{ status: number; body: T | null }> {
  const token = await getBearerToken(page)
  const resp = await page.request.patch(API_BASE + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data: json,
  })
  let body: T | null = null
  try {
    body = (await resp.json()) as T
  } catch {
    body = null
  }
  return { status: resp.status(), body }
}

export async function apiDelete(page: Page, path: string): Promise<number> {
  const token = await getBearerToken(page)
  const resp = await page.request.delete(API_BASE + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return resp.status()
}

/** Create a space via the API (after signing in). */
export async function createSpace(
  page: Page,
  opts: { key: string; name: string; description?: string },
) {
  const r = await apiPost<{ id: string; key: string; name: string }>(page, '/spaces', {
    key: opts.key,
    name: opts.name,
    description: opts.description ?? '',
  })
  if (r.status !== 201 || !r.body) {
    throw new Error(`createSpace failed: status=${r.status} body=${JSON.stringify(r.body)}`)
  }
  return r.body
}

/** Create an article via the API. */
export async function createArticle(
  page: Page,
  opts: {
    space_id: string
    title: string
    body_md?: string
    body_html?: string
    status?: 'draft' | 'published'
  },
) {
  const r = await apiPost<{ id: string; title: string; status: string }>(page, '/articles', {
    space_id: opts.space_id,
    title: opts.title,
    body_md: opts.body_md ?? '',
    body_html: opts.body_html ?? '',
    status: opts.status ?? 'draft',
  })
  if (r.status !== 201 || !r.body) {
    throw new Error(`createArticle failed: status=${r.status} body=${JSON.stringify(r.body)}`)
  }
  return r.body
}
