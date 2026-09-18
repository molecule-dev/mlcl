import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('forgot-password form renders email field + submit', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.locator('input#email')).toBeVisible()
  await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
})

test('Submitting the email POSTs /api/users/forgot-password 2xx and shows success state', async ({
  page,
}) => {
  const { email } = await signup(page)
  await page.evaluate(() => window.localStorage.clear())
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input#email').fill(email)
    await page.getByRole('button', { name: /send reset link/i }).click()
    await expect(page.getByRole('status')).toBeVisible({ timeout: 10000 })
  })
  const fp = reqs.find((r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url))
  expect(fp?.status, 'POST /api/users/forgot-password expected 2xx').toBeLessThan(300)
  await expect(page.getByText(/check your inbox/i)).toBeVisible()
  // Email address may not be reflected in the success copy by every i18n
  // template — confirm the success state is shown is enough; the real
  // outcome (server received the request) is asserted via the network probe.
})

test('Submitting for an unknown email still returns success (no user enumeration)', async ({
  page,
}) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input#email').fill('does-not-exist+' + Date.now() + '@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()
    await page.waitForTimeout(2000)
  })
  const fp = reqs.find((r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url))
  expect(fp?.status, 'forgot-password is intentionally non-enumerating').toBeLessThan(300)
})

test('Back to sign in link returns user to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.getByRole('link', { name: /back to sign in/i }).click()
  await expect(page).toHaveURL(/\/login/)
})
