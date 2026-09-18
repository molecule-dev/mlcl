/**
 * /forgot-password — request password reset link.
 *
 * Per-page spec covering each row in observations/forgot-password.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('"Obscura" brand heading rendered on /forgot-password', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.getByRole('heading', { name: /Obscura/ })).toBeVisible()
})

test('email input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('input[type="email"]').fill('forgot@example.com')
  await expect(page.locator('input[type="email"]')).toHaveValue('forgot@example.com')
})

test('Send-link submit fires POST /api/users/forgot-password', async ({ page }) => {
  const ts = Date.now()
  const { email } = await signup(page, `forgot-real-${ts}@example.com`)
  await page.context().clearCookies()
  await page.goto(APP_BASE + '/forgot-password')
  const { reqs } = await captureNetwork(page, async () => {
    await page.locator('input[type="email"]').fill(email)
    await page.getByRole('button', { name: /send.*link|reset|submit/i }).click()
    await page.waitForLoadState('networkidle')
  })
  const call = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST')
  expect(call, 'POST /api/users/forgot-password should fire').toBeTruthy()
  expect(call!.status).toBeLessThan(400)
})

test('Back-to-sign-in link → /login', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page
    .getByRole('link', { name: /back.*sign in|sign\s*in/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/)
})

test('POST /users/forgot-password returns 2xx for unknown emails too (no leak)', async ({
  page,
  request,
}) => {
  const r = await request.post(`${API_BASE}/users/forgot-password`, {
    data: { email: uniqueEmail('forgot-unknown') },
    headers: { 'content-type': 'application/json' },
  })
  expect(r.status()).toBeLessThan(400)
})
