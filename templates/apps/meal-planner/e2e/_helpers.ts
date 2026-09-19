// Shared Playwright helpers for the meal-planner (Simmer) e2e suite.
// Imported by every .spec.ts file rather than duplicating signup/auth/api.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'simmer'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Monday (ISO) of the week containing today — the plan's week_start key. */
export function weekStart(today = new Date()): string {
  const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const dow = (d.getUTCDay() + 6) % 7 // 0=Mon..6=Sun
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

/**
 * Sign up a fresh user via the public signup form. The Simmer signup page
 * has separate name + email + password (+ confirm-password) inputs. After
 * submit the form routes new users through /onboarding.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.waitForLoadState('domcontentloaded')
  const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first()
  if (await nameInput.count()) await nameInput.fill('Simmer User')
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
  await expect(page).toHaveURL(/\/(onboarding|plan)/, { timeout: 20_000 })
  return { email, password }
}

/**
 * Walk the 3-step onboarding wizard end-to-end and finish — leaves the
 * user on /plan with household/diet preferences stored.
 */
export async function completeOnboarding(page: Page): Promise<void> {
  await page.goto(APP_BASE + '/onboarding')
  await page.waitForLoadState('domcontentloaded')
  // Welcome
  await page.locator('[data-mol-id="onboarding-next"]').click()
  // Household size
  await page.locator('[data-mol-id="onboarding-household-4"]').click()
  await page.locator('[data-mol-id="onboarding-next"]').click()
  // Diet
  await page.locator('[data-mol-id="onboarding-diet-everything"]').click()
  await page.locator('[data-mol-id="onboarding-next"]').click()
  await expect(page).toHaveURL(/\/plan/, { timeout: 15_000 })
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

/**
 * Create a personal recipe through the same POST the UI form submits.
 * Returns the created row. Names are caller-unique so specs never collide
 * with each other or with the shared starter catalog.
 */
export async function createRecipe(
  page: Page,
  overrides: Partial<{
    title: string
    servings: number
    prep_minutes: number
    cook_minutes: number
    tags: string[]
    ingredients: Array<{ item_name: string; quantity: number; unit: string }>
    steps: Array<{ text: string }>
  }> = {},
): Promise<{
  id: string
  title: string
  servings: number
  prep_minutes: number
  cook_minutes: number
  tags: string[]
}> {
  const title = overrides.title ?? `Spec Skillet ${Date.now()}-${++counter}`
  return api(page, 'POST', '/recipes', {
    title,
    description: 'Created by the e2e suite for structural assertions.',
    servings: overrides.servings ?? 2,
    prep_minutes: overrides.prep_minutes ?? 5,
    cook_minutes: overrides.cook_minutes ?? 10,
    tags: overrides.tags ?? ['dinner', 'spec'],
    image_emoji: '🍜',
    ingredients: overrides.ingredients ?? [
      { item_name: `spec noodles ${Date.now()}`, quantity: 200, unit: 'g' },
      { item_name: `spec greens ${Date.now()}`, quantity: 1, unit: 'bunch' },
    ],
    steps: overrides.steps ?? [{ text: 'Boil everything together.' }],
  })
}
