import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE } from './_helpers.js'

test('Reset password page renders with a token present', async ({ page }) => {
  // The reset-password page reads ?token=... from the URL. We don't have a
  // real token, but the page must render the form, not 404 or crash.
  await page.goto('/reset-password?token=fake-token-for-render-test')
  await expect(page.locator('body')).toContainText(/new password|password|reset/i, {
    timeout: 10_000,
  })
})

test('Reset password form exposes new-password + confirm-password inputs and a Submit button', async ({
  page,
}) => {
  await page.goto('/reset-password?token=render-test')
  // The first password input is the new password; the second is the
  // confirmation. Both should accept input.
  const inputs = page.locator('input[type="password"]')
  await expect(inputs.first()).toBeVisible({ timeout: 10_000 })
  await expect(inputs.nth(1)).toBeVisible()
  await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
})

test('Resetting password with an invalid token returns 4xx (real backend contract)', async ({
  page,
}) => {
  // Direct-API contract: an invalid/expired token must not be silently
  // accepted. A 2xx with no actual update would be the same kind of
  // bug as Stripe-checkout-no-webhook (looks like it worked, didn't).
  const resp = await page.request.post(API_BASE + '/users/reset-password', {
    data: { token: 'totally-fake-token', password: 'NewPass123!' },
  })
  expect(resp.status(), 'reset-password must reject a fake token').toBeGreaterThanOrEqual(400)
  expect(resp.status()).toBeLessThan(500)
})
