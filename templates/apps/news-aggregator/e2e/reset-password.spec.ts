/**
 * Per-page coverage for /reset-password. Cross-references e2e/observations/reset-password.md.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('with a token query param renders the form (heading + submit button)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password?token=fake-test-token')
    })
    await expect(
      page.getByRole('heading', { name: /reset|new password|choose/i }).first(),
    ).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.getByRole('button', { name: /reset.*password|set.*password/i }).first(),
    ).toBeVisible()
    expect(reqs.length).toBeGreaterThan(0)
  })

  test('without a token surfaces an error / back-link state, not a crash', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const link = page.getByRole('link', { name: /sign in|log in|forgot/i }).first()
    const button = page.getByRole('button', { name: /sign in|back|forgot/i }).first()
    const visible =
      (await link.isVisible().catch(() => false)) || (await button.isVisible().catch(() => false))
    expect(visible).toBe(true)
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake')
    await page
      .getByRole('link', { name: /back to sign in|sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
