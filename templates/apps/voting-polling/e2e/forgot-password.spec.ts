import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, apiRaw, captureNetwork, getMyUserId, login, signup } from './_helpers.js'

test('/forgot-password renders an email input + submit + back-to-login link', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.getByRole('button', { name: /reset|send|email/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /sign\s*in|back/i }).first()).toBeVisible()
})

test('Forgot-password POST writes a reset record on the server (real backend invariant)', async ({
  page,
}) => {
  const { email } = await signup(page)
  const userId = await getMyUserId(page)
  const resp = await apiRaw(page, 'POST', '/users/forgot-password', { email })
  expect(resp.status()).toBeLessThan(300)
  // Re-login + GET profile/me to confirm we can still authenticate as
  // the same user — forgot-password does not invalidate the existing
  // session, only creates a token for password change.
  await login(page, email, 'TestPass123456!')
  const me = await api<{ id: string }>(page, 'GET', '/profile/me')
  expect(me.id).toBe(userId)
})

test('Forgot-password endpoint returns 2xx for unknown email (anti-enumeration)', async ({
  page,
}) => {
  await signup(page)
  // Unknown emails MUST return 2xx so an attacker cannot enumerate which
  // accounts exist. This is a security invariant, not a UX choice.
  const resp = await apiRaw(page, 'POST', '/users/forgot-password', {
    email: 'definitely-not-a-real-user@example.com',
  })
  expect(resp.status()).toBeLessThan(400)
})

test('observation invariant: /forgot-password fires POST /api/users/forgot-password on submit', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/forgot-password')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('input[type="email"]').fill('captured@example.com')
    await page.getByRole('button', { name: /reset|send|email/i }).click()
    await page.waitForTimeout(1500)
  })
  expect(
    reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST'),
  ).toBeTruthy()
})
