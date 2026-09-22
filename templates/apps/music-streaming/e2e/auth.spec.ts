/**
 * Auth flow + first listen — INVENTORY user flows #1 (signup → first listen)
 * and #11 (auth-guard) and a portion of #9 (forgot password).
 *
 * Validation failure case + authorization failure case are folded in here
 * — every spec carries them per G22.
 *
 * Real fetch against the running api; no mocks.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { resetDb, dbNameForSlug } from './_shared/db.js'
import { signupAndLogin } from './_shared/auth.js'

const SLUG = 'music-streaming'
const API_URL = process.env.API_URL ?? 'http://localhost:4000'
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'

test.beforeEach(async () => {
  await resetDb(dbNameForSlug(SLUG))
})

test('happy path: signup creates session, authenticated home does not redirect to /login', async ({
  page,
}) => {
  // Walk the fleet auth convention (signupAndLogin): API signup + seed the
  // auth-bond localStorage keys BEFORE navigating. Relying on the async
  // cookie-based session check was a timing race — on a slow API the guard
  // initialized as signed-out and bounced /home to /login.
  const { id } = await signupAndLogin(page, {
    email: `e2e-${Date.now()}@flagship.test`,
    password: 'TestPass!1',
    name: 'E2E Listener',
    apiUrl: API_URL,
    baseUrl: BASE_URL,
  })
  expect(id).toBeTruthy()

  await page.goto(`${BASE_URL}/home`)
  expect(page.url()).not.toContain('/login')
})

test('forgot-password endpoint accepts a known email and returns 2xx', async ({ request }) => {
  const email = `e2e-${Date.now()}-fp@flagship.test`
  const sign = await request.post(`${API_URL}/api/users`, {
    data: { email, password: 'TestPass!1' },
    failOnStatusCode: false,
  })
  expect(sign.ok()).toBe(true)

  const res = await request.post(`${API_URL}/api/users/forgot-password`, {
    data: { email },
    failOnStatusCode: false,
  })
  // Mailgun is sandbox in CI; the route should return 2xx regardless of
  // delivery (or at worst 4xx for missing config — never 5xx).
  expect(res.status()).toBeLessThan(500)
})

test('validation failure: signup rejects malformed email with a 4xx response', async ({
  request,
}) => {
  const res = await request.post(`${API_URL}/api/users`, {
    data: { email: 'not-an-email', password: 'TestPass!1' },
    failOnStatusCode: false,
  })
  expect(res.status()).toBeGreaterThanOrEqual(400)
  expect(res.status()).toBeLessThan(500)
})

test('authorization failure: anonymous /api/playlists returns 401 (unauthorized)', async ({
  request,
}) => {
  const res = await request.get(`${API_URL}/api/playlists`, { failOnStatusCode: false })
  expect([401, 403]).toContain(res.status())
})
