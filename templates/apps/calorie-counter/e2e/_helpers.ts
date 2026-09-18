// Shared Playwright helpers for the calorie-counter (Nosh) e2e suite.
// Imported by every .spec.ts file rather than duplicating signup/auth/api.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'nosh'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export function todayDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Sign up a fresh user via the public signup form. The Nosh signup page
 * has separate name + email + password (+ confirm-password) inputs. After
 * submit the AuthGuard sends new users through /onboarding.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.waitForLoadState('domcontentloaded')
  const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first()
  if (await nameInput.count()) await nameInput.fill('Nosh User')
  await page.locator('input[type=email], input[name=email]').first().fill(email)
  const pws = page.locator('input[type=password]')
  await pws.nth(0).fill(password)
  if ((await pws.count()) > 1) await pws.nth(1).fill(password)
  const submit = page.getByRole('button', { name: /create\s*account|sign\s*up/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/(onboarding|today)/, { timeout: 20_000 })
  return { email, password }
}

/**
 * Walk the 4-step onboarding wizard end-to-end and finish — leaves the
 * user on /today with persisted goals.
 */
export async function completeOnboarding(page: Page): Promise<void> {
  await page.goto(APP_BASE + '/onboarding')
  await page.waitForLoadState('domcontentloaded')
  // Welcome
  await page.getByRole('button', { name: /continue/i }).click()
  // Goal
  await page.getByRole('button', { name: /maintain/i }).click()
  await page.getByRole('button', { name: /continue/i }).click()
  // Activity — buttons render as "directions_runActiveWorkouts 3-5×/wk"
  await page
    .locator('button', { hasText: /^directions_runActive/ })
    .first()
    .click()
  await page.getByRole('button', { name: /continue/i }).click()
  // Macros
  await page.locator('[data-testid="onboarding-finish"]').click()
  await expect(page).toHaveURL(/\/today/, { timeout: 15_000 })
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type=email]').first().fill(email)
  await page.locator('input[type=password]').first().fill(password)
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

/** Capture every API response that fires while `fn` runs. */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: {
    url: () => string
    status: () => number
    request: () => { method: () => string }
  }) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp as never)
  try {
    await fn()
  } finally {
    page.off('response', onResp as never)
  }
  return reqs
}

/**
 * Authenticated fetch through the page's session cookies. Returns the
 * parsed JSON body (or undefined for 204).
 */
export async function api<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> {
  const cookies = await page.context().cookies()
  const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
  const headers: Record<string, string> = cookieStr ? { Cookie: cookieStr } : {}
  if (data !== undefined) headers['Content-Type'] = 'application/json'
  const url = path.startsWith('http')
    ? path
    : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\/?(api\/)?/, '')}`
  const resp = await page.request.fetch(url, {
    method,
    headers,
    data: data === undefined ? undefined : JSON.stringify(data),
  })
  expect(resp.status(), `${method} ${path}`).toBeLessThan(400)
  if (resp.status() === 204) return undefined as T
  const text = await resp.text()
  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}

/** Convenience: numeric-coerce any pg `numeric`/`text` value. */
export function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number.parseFloat(v) || 0
  return 0
}
