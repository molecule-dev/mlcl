import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('Public marketing pages', () => {
  test('Landing page renders without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: /Sign in/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Start branching|Sign up/i }).first()).toBeVisible()
  })

  test('Pricing page renders without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page).toHaveURL(/\/pricing/)
    // Some heading should mention plans/pricing/etc.
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Forgot password renders + posts to API', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible()
    await emailInput.fill('does-not-exist@flagship.test')
    const button = page.locator('form button[type="submit"]').first()
    const respPromise = page.waitForResponse(
      (resp) => /forgot-password/.test(resp.url()) && resp.request().method() === 'POST',
      { timeout: 10000 },
    )
    await button.click()
    const resp = await respPromise
    // Whether the email exists or not, the API returns 200 to avoid
    // user enumeration — we just want to verify the call was made.
    expect([200, 204]).toContain(resp.status())
  })
})
