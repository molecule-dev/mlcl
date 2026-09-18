import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors } from './_helpers.js'

test.describe('reset-password page', () => {
  test('renders a password field and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=test-token-123')
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: /reset|update|change|set\s*password|sign\s*in/i }).first(),
    ).toBeVisible()
  })

  test('submitting a new password POSTs /api/users/reset-password', async ({ page }) => {
    // Prefill token + email via URL so required fields are populated.
    await page.goto(
      APP_BASE + '/reset-password?token=fake-token-for-network-only&email=resettest@example.com',
    )
    const passwordInputs = page.locator('input[type="password"]')
    await passwordInputs.first().fill('NewPass123!')
    if (
      await passwordInputs
        .nth(1)
        .count()
        .catch(() => 0)
    )
      await passwordInputs.nth(1).fill('NewPass123!')
    const requests = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset|update|change|set\s*password|sign\s*in/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const call = requests.find(
      (r) => r.method === 'POST' && /\/users\/reset-password\b/.test(r.url),
    )
    expect(call, 'POST /api/users/reset-password not observed').toBeTruthy()
  })

  test('back-to-sign-in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in|back/i }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/login$/)
    }
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/reset-password?token=fake')
      await expect(page.locator('input[type="password"]').first()).toBeVisible()
    })
  })
})
