/**
 * /reset-password — finalise a password reset with a token from email.
 *
 * Asserts: URL params (`?token=` and `?email=`) pre-fill the form;
 * mismatched passwords are gated client-side (no POST fires + alert);
 * back-to-login link routes correctly.
 *
 * captureNetwork() is used to confirm the no-POST behaviour on the
 * mismatch path.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('URL params pre-fill email + token inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token-123&email=preset@flagship.test')
    await expect(page.locator('input#email')).toHaveValue('preset@flagship.test')
    await expect(page.locator('input#token')).toHaveValue('fake-token-123')
  })

  test('mismatched passwords block the POST and surface an inline alert', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token-456&email=mismatch@flagship.test')
    await page.locator('input#password').fill('PasswordA1!')
    await page.locator('input#confirm').fill('PasswordB2!')

    const calls = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="reset-submit"]').click()
      await page.waitForTimeout(500)
    })
    const post = calls.find(
      (c) => c.method === 'POST' && /\/api\/users\/reset-password/.test(c.url),
    )
    expect(post, 'mismatched submit must NOT POST /api/users/reset-password').toBeUndefined()
    await expect(page.getByText(/Passwords don.+t match/i)).toBeVisible()
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('"Back to sign in" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await page.waitForURL(/\/login/)
  })
})
