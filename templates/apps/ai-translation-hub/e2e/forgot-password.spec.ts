import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('forgot-password /forgot-password', () => {
  test('submits POST /api/users/forgot-password with the email', async ({ page }) => {
    const { email } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForTimeout(2000)
    })
    const sent = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(sent, 'POST /api/users/forgot-password not observed').toBeTruthy()
    expect(sent!.status).toBeLessThan(500)
  })

  test('Back to sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const input = page.locator('input[type="email"]').first()
    await input.fill('reset@example.com')
    await expect(input).toHaveValue('reset@example.com')
  })
})
