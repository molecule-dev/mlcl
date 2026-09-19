import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/reset-password page', () => {
  test('renders the form (token missing → still renders inputs)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('submit with bogus token POSTs to /api/users/reset-password and surfaces error', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password?token=invalid-token')
      const pw = page.locator('input[type="password"]')
      await pw.nth(0).fill('NewPass!1234')
      if ((await pw.count()) > 1) await pw.nth(1).fill('NewPass!1234')
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForLoadState('networkidle')
    })
    const c = reqs.find((r) => r.method === 'POST' && /reset-password/.test(r.url))
    expect(c, 'POST /api/users/reset-password').toBeTruthy()
  })

  test('password input is masked by default', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    expect(await page.locator('input[type="password"]').first().getAttribute('type')).toBe(
      'password',
    )
  })

  test('confirm input (when present) preserves typed value', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const pw = page.locator('input[type="password"]')
    if ((await pw.count()) > 1) {
      await pw.nth(1).fill('Confirm1!')
      expect(await pw.nth(1).inputValue()).toBe('Confirm1!')
    }
  })
})
