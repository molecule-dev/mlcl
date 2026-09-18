import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE } from './_helpers'

test.describe('/reset-password', () => {
  test('renders email + token + password fields without query params', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /re-encrypt|submit|reset/i })).toBeVisible()
  })

  test('with ?token & ?email query params, hides those inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc-123&email=user%40example.com')
    expect(await page.locator('input[type="email"]').count()).toBe(0)
    await expect(page.locator('input[type="password"]')).toHaveCount(2)
  })

  test('Back to Sign In link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /back to sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
