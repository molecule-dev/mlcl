import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password page', () => {
  test('submitting the form posts to the password-reset endpoint and shows confirmation', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = uniqueEmail('forgot')
    await page.locator('input[type="email"]').first().fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForTimeout(1500)
    })
    const reset = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/i.test(r.url),
    )
    expect(reset, 'password reset POST').toBeTruthy()
    expect(reset?.status).toBeLessThan(500)
    // Success surface visible.
    await expect(page.getByText(/reset link sent/i).first()).toBeVisible()
  })

  test('"Back to sign in" link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('a[href="/login"]').first().click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('email input is required and type=email', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = page.locator('input[type="email"]').first()
    await expect(email).toBeVisible()
    expect(await email.evaluate((el: HTMLInputElement) => el.required)).toBe(true)
  })
})
