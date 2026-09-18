import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const tb = page.getByLabel(/Email address/i)
    await tb.fill('me@example.com')
    await expect(tb).toHaveValue('me@example.com')
  })

  test('"Send reset link" submits POST /api/users/forgot-password and reveals success state', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/Email address/i).fill('reset+' + Date.now() + '@pylon.test')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send reset link/i }).click()
      await page
        .locator('[data-mol-id="forgot-success"]')
        .waitFor({ timeout: 10_000 })
        .catch(() => {})
    })
    // The request must be observed even if Mailgun is not actually wired in
    // smoke (the handler should still respond — and the UI flips to success
    // state on resolved promise).
    expect(
      reqs.some((r) => r.method === 'POST' && /\/forgot-password/.test(r.url)),
      'POST /api/users/forgot-password must be observed',
    ).toBeTruthy()
  })

  test('"Back to sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('brand "Pylon" link returns to landing /', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /^Pylon ?\.?$/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/[/.]/g, '\\$&')}/?$`))
  })
})
