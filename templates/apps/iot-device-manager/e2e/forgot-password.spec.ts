import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/forgot-password page', () => {
  test('Email textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill('reset@example.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('reset@example.com')
  })

  test('Send Reset Link button posts to /api/users/forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill('reset@example.com')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send reset link/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(post, 'POST /api/users/forgot-password').toBeTruthy()
  })

  test('Sign In link routes back to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('a[href="/login"]').first().click()
    await page.waitForURL(/\/login/, { timeout: 5000 })
  })
})
