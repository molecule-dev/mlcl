import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Forgot password /forgot-password', () => {
  test('submitting an email POSTs /api/users/forgot-password (200)', async ({ page }) => {
    const { email } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()

    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForTimeout(2500)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(post, 'expected POST /api/users/forgot-password').toBeTruthy()
    expect(post!.status).toBeLessThan(300)
  })

  test('non-existent email is not enumerable (still 200)', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page
        .locator('input[type="email"]')
        .first()
        .fill('does-not-exist+' + Date.now() + '@flagship.test')
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForTimeout(2500)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(post).toBeTruthy()
    expect(post!.status).toBeLessThan(300)
  })

  test('back arrow returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('button', { name: /back|go back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
