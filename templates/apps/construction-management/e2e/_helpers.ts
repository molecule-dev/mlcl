// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3022')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4022') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'cm') {
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

/** Sign up a fresh user; returns the credentials AND the JWT bearer
 *  token persisted to localStorage by the auth client so callers can
 *  authenticate page.request.* calls.
 *
 *  Hardened against the auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit so a fast response can't be missed, gate on
 *  status < 400, then wait for navigation off /signup, then for the
 *  token to land in localStorage. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name').fill('Test User')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  // Wait for auth cookie to be set before reading it.
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 15000,
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
  return { email, password, accessToken: accessToken as string, userId }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.getByRole('button', { name: /sign in/i })
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

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

/** Wait until the seeded demo data has been written to the user's tenant.
 *  The first GET /api/projects triggers seedDemoForUser, which inserts the
 *  jobsites, daily logs, punch items, RFIs, and subcontractors. Subsequent
 *  reads see the seeded rows. */
export async function waitForSeed(page: Page, accessToken: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await page.request.get(`${API_BASE}/projects`, {
      headers: apiHeaders(accessToken),
    })
    if (res.status() === 200) {
      const body = (await res.json()) as Array<unknown>
      if (Array.isArray(body) && body.length > 0) return body
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('seed never produced projects')
}

export interface ProjectRow {
  id: string
  name: string
  code: string
  phase: string
}

/** Get the seeded projects via the API — specs assert against these rows
 *  instead of naming demo content. */
export async function listProjects(page: Page, accessToken: string): Promise<ProjectRow[]> {
  const res = await page.request.get(`${API_BASE}/projects`, { headers: apiHeaders(accessToken) })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as ProjectRow[]
}

/** Today's local day key — matches the daily-log create form default. */
export function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
