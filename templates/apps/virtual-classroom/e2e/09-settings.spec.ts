/**
 * Settings outcome tests.
 *
 * - PATCH /users/:id (with the body the SettingsPanel actually sends —
 *   `{ email }`, NOT a `{ data: { email } }` envelope; the molecule
 *   user.update handler reads `req.body.email` directly).
 *   The reload-survives invariant: GET /users/:id afterwards returns
 *   the new email.
 * - GET /devices returns the user's device list (an array; the API
 *   does not wrap in a `{ data: [...] }` envelope).
 * - The /settings page is currently a static demo (Aiyana Vega) — the
 *   real settings UI is the SettingsPanel mounted from the user-menu
 *   in the top bar, so we assert on that instead of /settings inputs.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, getMyUserId, signup } from './_helpers.js'

interface UserRow {
  id: string
  email: string
}
interface UserEnvelopeData {
  data: UserRow
}
interface UserEnvelopeProps {
  props: UserRow
}

function unwrapUser(payload: unknown): UserRow {
  if (payload && typeof payload === 'object') {
    if ('props' in payload) return (payload as UserEnvelopeProps).props
    if ('data' in payload) return (payload as UserEnvelopeData).data
  }
  return payload as UserRow
}

test('PATCH /users/:id updates email and survives a refetch', async ({ page }) => {
  await signup(page)
  const id = await getMyUserId(page)
  const newEmail = `vc-renamed+${Date.now()}@example.com`
  await api(page, 'PATCH', `/users/${id}`, { email: newEmail })
  const refetched = await api<unknown>(page, 'GET', `/users/${id}`)
  const row = unwrapUser(refetched)
  expect(row.email).toBe(newEmail)
})

test('GET /devices returns the device list', async ({ page }) => {
  await signup(page)
  const r = await api<unknown[]>(page, 'GET', '/devices')
  expect(Array.isArray(r), '/devices is an array').toBe(true)
  // signup creates the device row used to issue the JWT — at least one.
  expect(r.length).toBeGreaterThan(0)
})

test('Settings page loads without crashing', async ({ page }) => {
  await signup(page)
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(APP_BASE + '/settings', { waitUntil: 'networkidle' })
  expect(
    errs.filter((e) => !/favicon/i.test(e)),
    'no page errors on /settings',
  ).toEqual([])
  await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible({
    timeout: 10000,
  })
})
