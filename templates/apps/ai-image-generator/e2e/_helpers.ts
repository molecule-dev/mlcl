// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Sign up a fresh user; returns the credentials.
 *
 *  Hardened against the auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit so a fast response can't be missed, gate on
 *  status < 400, then wait for navigation. Eliminates the API-only flake
 *  where a spec read the persisted JWT from localStorage (or fired an
 *  authed API call) before the auth-state hook wrote it. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // First/Last name are required by the signup form. Best-effort fill — placeholders 'Aria'/'Lin'.
  const first = page.locator('input[placeholder="Aria"]').first()
  if (await first.count().catch(() => 0)) await first.fill('Test')
  const last = page.locator('input[placeholder="Lin"]').first()
  if (await last.count().catch(() => 0)) await last.fill('User')
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/^password$/i)
    .first()
    .fill(password)
  const confirm = page.getByLabel(/confirm.*password|password.*confirm/i).first()
  if (await confirm.count().catch(() => 0)) await confirm.fill(password)
  const terms = page.getByRole('checkbox', { name: /terms|agree/i }).first()
  if (await terms.count().catch(() => 0)) await terms.check()
  const submit = page
    .getByRole('button', { name: /sign\s*up|create.*account|register|get\s*started/i })
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
  // The post-signup bootstrap call seeds collections/styles/etc.; give it a moment to settle so
  // subsequent navigations to /dashboard, /gallery, /collections see populated content.
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  return { email, password }
}

/** Get the first available image (generation) id for the signed-in user.
 *  Falls back to a stable seeded id from the bootstrap fixtures if none returned. */
export async function getFirstImageId(page: Page): Promise<string> {
  await page.goto(APP_BASE + '/gallery')
  const link = page.locator('a[href^="/images/"]').first()
  await link.waitFor({ timeout: 10000 })
  const href = await link.getAttribute('href')
  return href!.replace(/^.*\/images\//, '')
}

/** Get the first available collection id for the signed-in user. */
export async function getFirstCollectionId(page: Page): Promise<string> {
  await page.goto(APP_BASE + '/collections')
  const link = page.locator('a[href^="/collections/"]').first()
  await link.waitFor({ timeout: 10000 })
  const href = await link.getAttribute('href')
  return href!.replace(/^.*\/collections\//, '')
}

/**
 * GET a JSON endpoint from INSIDE the browser so the app's httpOnly auth
 * cookie rides along — Playwright's `page.request` keeps a separate cookie jar.
 * Specs use this to read the content they assert on from the same source the
 * page reads, instead of naming a row the starter content happens to carry.
 */
export async function apiGet<T>(page: Page, path: string): Promise<T> {
  const result = await page.evaluate(async (p: string) => {
    const resp = await fetch(p, { credentials: 'include' })
    if (!resp.ok) throw new Error(`GET ${p} → ${resp.status}`)
    return await resp.json()
  }, path)
  return result as T
}

/** A row that the app renders by name (collection, style preset, prompt). */
export interface NamedRow {
  id: string
  name?: string
  title?: string
}

/** The collections the signed-in user actually has. */
export async function getCollections(page: Page): Promise<NamedRow[]> {
  const rows = await apiGet<NamedRow[]>(page, '/api/collections')
  expect(rows.length, 'the user must have at least one collection').toBeGreaterThan(0)
  return rows
}

/** A style preset row as /api/styles returns it. */
export interface StyleRow {
  id: string
  name: string
  prompt_modifier?: string | null
  active?: boolean
}

/** The style presets the signed-in user actually has. */
export async function getStyles(page: Page): Promise<StyleRow[]> {
  const rows = await apiGet<StyleRow[]>(page, '/api/styles')
  expect(rows.length, 'the user must have at least one style preset').toBeGreaterThan(0)
  return rows
}

/**
 * A style preset carrying a real `prompt_modifier` — the ones that materially
 * change the upstream request, which is what the activation specs need.
 */
export async function pickModifierStyle(page: Page): Promise<StyleRow> {
  const styles = await getStyles(page)
  const withModifier = styles.find((s) => Boolean(s.prompt_modifier))
  if (!withModifier) throw new Error('no style preset carries a prompt_modifier')
  return withModifier
}

/** The prompt-library rows the signed-in user actually has. */
export async function getPrompts(page: Page): Promise<NamedRow[]> {
  return apiGet<NamedRow[]>(page, '/api/prompts')
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/password/i)
    .first()
    .fill(password)
  // Match generic submit labels plus this app's brand-specific CTA "Enter Reverie".
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in|enter\s*reverie/i }).first()
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

export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /account|menu|profile|user/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/** Capture all network responses during a block; mocked-only tests will
 *  return empty. Useful for asserting the app actually called the API. */
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

/** Fail the test if any console.error fires during fn (allowing benign
 *  third-party noise like favicon 404s). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: any) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}
