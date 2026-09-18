import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, uniqueEmail } from './_helpers.js'

test.describe('forgot-password page', () => {
  test('renders an email field and a submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByLabel(/email/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /send|reset|email/i }).first()).toBeVisible()
  })

  test('submitting an email POSTs /api/users/forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/email/i).first().fill(uniqueEmail('forgot'))
    const requests = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send|reset|email/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const call = requests.find(
      (r) => r.method === 'POST' && /\/users\/forgot-password\b/.test(r.url),
    )
    expect(call, 'POST /api/users/forgot-password not observed').toBeTruthy()
    expect(call!.status).toBeGreaterThanOrEqual(200)
    expect(call!.status).toBeLessThan(500)
  })

  test('back-to-sign-in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in|back/i }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/login$/)
    }
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await expect(page.getByLabel(/email/i).first()).toBeVisible()
    })
  })
})
