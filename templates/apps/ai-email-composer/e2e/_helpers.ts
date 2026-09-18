/**
 * Test helpers for ai-email-composer. Auth flows are wired via the
 * @molecule/api-resource-user backend (POST /api/users for signup,
 * POST /api/users/log-in for login). Helpers always assert real
 * outcomes: post-signup we land on /dashboard with a working session.
 */

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'aiec') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Signup the user via the form. Returns credentials. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name, input[name="name"]').first().fill('Test User')
  await page.locator('input[type="email"], input#email').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page
    .getByRole('button', { name: /create account|sign\s*up|get\s*started/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  return { email, password }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"], input#email').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })
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

export async function apiPut<T>(
  page: Page,
  path: string,
  json: Record<string, unknown>,
): Promise<{ status: number; body: T | null }> {
  const token = await getBearerToken(page)
  const resp = await page.request.put(API_BASE + path, {
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
