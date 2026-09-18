import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders form when no token is present', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.waitForLoadState('networkidle').catch(() => {})
    const text = await page.locator('main, body').first().innerText()
    // The page should render something, not crash, even without a token query param
    expect(text.length).toBeGreaterThan(0)
    expect(text).not.toMatch(/TypeError|Cannot|Internal Server Error/i)
  })

  test('with an obviously invalid token, submitting does not crash', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=invalid-token-xyz')
    const password = page.locator('input[type="password"]').first()
    if ((await password.count()) === 0) {
      // No password input — page may show "invalid token" message, accept that
      const text = await page.locator('main, body').first().innerText()
      expect(text.length).toBeGreaterThan(0)
      return
    }
    await password.fill('NewPass!9876')
    const submit = page.getByRole('button', { name: /reset|submit|update|set/i }).first()
    if ((await submit.count()) > 0) {
      await submit.click()
      await page.waitForTimeout(1500)
      const text = await page.locator('main, body').first().innerText()
      expect(text).not.toMatch(/TypeError|Cannot|Internal Server Error/i)
    }
  })

  test('navigation to /reset-password is allowed without auth', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto(APP_BASE + '/reset-password')
    await expect(page).toHaveURL(/\/reset-password/)
  })
})
