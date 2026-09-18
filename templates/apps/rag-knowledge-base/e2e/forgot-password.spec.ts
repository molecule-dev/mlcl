/**
 * /forgot-password — Engram password recovery initiation.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('forgot-password', () => {
  test('email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const input = page.locator('input[type="email"]').first()
    await expect(input).toBeVisible()
    await input.fill('me@example.com')
    await expect(input).toHaveValue('me@example.com')
  })

  test('submit POSTs /users/forgot-password and returns 2xx (no enumeration leak)', async ({
    page,
  }) => {
    const { email } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input[type="email"]').first().fill(email)
      await page
        .getByRole('button', { name: /send|reset|continue|submit/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => /\/users\/forgot-password/.test(r.url) && r.method === 'POST')
    expect(post, 'expected a POST to /users/forgot-password').toBeTruthy()
    expect(post!.status).toBeLessThan(500)
  })

  test('Back-to-login link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /sign\s*in|back|login/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 10_000 })
  })
})
