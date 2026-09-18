import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, rawApi } from './_helpers'

test.describe('/reset-password — confirm a new password from a reset token', () => {
  test('renders email + token + password + confirm fields and disables submit when mismatched', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="text"]').first()).toBeVisible() // token
    const passwords = page.locator('input[type="password"]')
    await expect(passwords).toHaveCount(2)
    await page.locator('input[type="email"]').fill('e@example.test')
    await page.locator('input[type="text"]').first().fill('fake-token')
    await passwords.nth(0).fill('NewPass1234!')
    await passwords.nth(1).fill('NopeMismatch')
    // mismatch text is rendered and submit is disabled
    await expect(page.locator('text=/passwords do not match/i')).toBeVisible()
    await expect(page.locator('form button[type="submit"]')).toBeDisabled()
  })

  test('passing a bogus token returns a non-2xx status from the API', async ({ page }) => {
    // Drive the page so we observe the actual POST as the captured-network record.
    await page.goto(APP_BASE + '/reset-password?email=qa@example.com&token=definitely-not-real')
    const reqs = await captureNetwork(page, async () => {
      const { status } = await rawApi(page, 'POST', '/users/reset-password', {
        token: 'definitely-not-real-' + Date.now(),
        password: 'NewPass1234!',
      })
      // Whether 400 or 404, the API must reject — never silently 200.
      expect(status, `bogus reset token returned ${status} (must be ≥400)`).toBeGreaterThanOrEqual(
        400,
      )
    })
    void reqs // network capture is implicit via the rawApi call above
  })

  test('email & token query params pre-fill the form', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=qa@example.com&token=abc123')
    await expect(page.locator('input[type="email"]')).toHaveValue('qa@example.com')
    await expect(page.locator('input[type="text"]').first()).toHaveValue('abc123')
  })
})
