import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  seedEvent,
  seedOrder,
  seedTier,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/forgot-password page', () => {
  test('submitting an email POSTs to /api/users/forgot-password', async ({ page }) => {
    const email = uniqueEmail('forgot')
    await signup(page, email, 'TestPass!1234')
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForLoadState('networkidle')
    })
    const f = reqs.find((r) => r.method === 'POST' && /forgot-password/.test(r.url))
    expect(f, 'POST /api/users/forgot-password').toBeTruthy()
    expect(f?.status).toBeLessThan(500)
  })

  test('email input retains value on type', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill('example@test.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('example@test.com')
  })

  test('back-to-login link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('a[href="/login"]').first().click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })
})
