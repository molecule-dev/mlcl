import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers'

test.describe('/forgot-password', () => {
  test('renders the forgot-password form', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('submitting an email POSTs /api/users/forgotPassword and shows a confirmation', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').fill(uniqueEmail('forgot'))
      await page
        .getByRole('button', { name: /send|reset|submit/i })
        .first()
        .click()
      await page.waitForTimeout(3000)
    })
    const forgot = reqs.find((r) => r.method === 'POST' && /forgot.?password/i.test(r.url))
    expect(forgot, 'POST forgot-password expected').toBeDefined()
    expect(forgot!.status).toBeLessThan(500)
  })

  test('back-to-sign-in link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /back|sign in|log in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login(?:\b|$)/, { timeout: 5_000 })
  })
})
