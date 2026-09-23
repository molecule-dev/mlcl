import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders new-password + confirm + submit button (no token still rendered)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password')
    const pws = page.locator('input[type="password"]')
    await expect(pws.nth(1)).toBeAttached()
    await expect(
      page.getByRole('button', { name: /update password|reset|updating/i }).first(),
    ).toBeVisible()
  })

  test('submitting without a token surfaces the "invalid or expired" error', async ({ page }) => {
    // The API's 400 "Token is required." IS the case under test — allow
    // the console noise the browser logs for that rejected request.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: /status of 400/,
    })
    await page.goto(APP_BASE + '/reset-password')
    const pws = page.locator('input[type="password"]')
    await pws.nth(0).fill('NewPass1234!')
    await pws.nth(1).fill('NewPass1234!')
    await page
      .getByRole('button', { name: /update password/i })
      .first()
      .click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('mismatched passwords surface the "do not match" error', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token-just-for-validation')
    const pws = page.locator('input[type="password"]')
    await pws.nth(0).fill('NewPass1234!')
    await pws.nth(1).fill('Different1234!')
    await page
      .getByRole('button', { name: /update password/i })
      .first()
      .click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 })
  })

  test('back-to-sign-in link routes to /login when present', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const link = page.getByRole('link', { name: /back.*sign.*in|^sign in$/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    }
  })

  test('a malformed token query string still shows the form (not a crash)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=&other=1')
    const pws = page.locator('input[type="password"]')
    await expect(pws.first()).toBeAttached()
    await expect(
      page.getByRole('button', { name: /update password|reset|updating/i }).first(),
    ).toBeVisible()
  })
})
