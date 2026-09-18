// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page } from '@molecule/app-e2e-fixtures-default'

// Re-export the molecule-wrapped `test` + `expect` so every spec gets
// the auto-attached browser console-error guard. Specs should
// `import { test, expect } from './_helpers.js'` — NOT from
// '@playwright/test' directly.
export { test, expect } from '@molecule/app-e2e-fixtures-default'

// Common Playwright types are re-exported here so specs can do
// `import type { Page, ... } from './_helpers.js'` for everything.
export type {
  APIRequestContext,
  Browser,
  BrowserContext,
  ConsoleMessage,
  Locator,
  Page,
  Response,
  Route,
} from '@molecule/app-e2e-fixtures-default'

// Need expect locally for the assertion helpers below.
import { expect } from '@molecule/app-e2e-fixtures-default'

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
 *  status < 400, then wait for navigation off /signup. Eliminates the
 *  API-only flake where a spec fired an authed call before the auth-state
 *  hook had persisted the token. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.getByRole('textbox', { name: /email/i }).first().fill(email)
  // VersoInput renders the hint in the same <label> wrapper, so the
  // password textbox's accessible name is "Password At least 8 characters."
  // Match by attribute or partial text instead of strict label.
  await page.locator('input[type="password"]').first().fill(password)
  const confirm = page.getByLabel(/confirm.*password|password.*confirm/i).first()
  if (await confirm.count().catch(() => 0)) await confirm.fill(password)
  const terms = page.getByRole('checkbox', { name: /terms|agree/i }).first()
  if (await terms.count().catch(() => 0)) await terms.check()
  const submit = page
    .getByRole('button', {
      name: /sign\s*up|create.*account|register|get\s*started|create my notebook/i,
    })
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
  await page.getByRole('textbox', { name: /email/i }).first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in|return to verso/i }).first()
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
