/**
 * Fleet-QA helper convention — `signup` + `APP_BASE` used by the capture
 * harness (`scripts/fleet-qa-capture.mjs`) and available to any spec that
 * wants a one-call authed page. Delegates to the shared API-driven helper
 * so the capture walks exactly the same auth path as the specs.
 */

import type { Page } from '@molecule/app-e2e-fixtures-default'

import { signupAndLogin } from './_shared/auth.js'

export const APP_BASE: string =
  process.env.APP_BASE ??
  process.env.BASE_URL ??
  'http://localhost:' +
    (process.env.VITE_PORT ?? '3501')

const API_URL: string =
  process.env.API_URL ?? 'http://localhost:' + (process.env.API_PORT ?? '4501')

let counter = 0

/**
 * Signs a fresh user up via the real API and seeds the browser context so
 * every subsequent `page.goto` is authenticated (lands past AuthGuard).
 */
export async function signup(page: Page): Promise<{ email: string; id: string }> {
  counter += 1
  const email = `qa-${Date.now()}-${counter}@flagship.test`
  const { id } = await signupAndLogin(page, {
    email,
    password: 'TestPass!1',
    apiUrl: API_URL,
    baseUrl: APP_BASE,
  })
  return { email, id }
}
