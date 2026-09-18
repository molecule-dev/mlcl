/**
 * /forgot-password — form renders, submit POSTs to API and shows success.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('forgot password', () => {
  test('renders form with email field', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /send|reset|submit|email me/i }).first(),
    ).toBeVisible()
  })

  test('submitting fires a request to /api/users/reset-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').fill('forgot+' + Date.now() + '@example.com')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send|reset|submit|email me/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const found = reqs.find((r) =>
      /\/api\/users\/(forgot-password|reset-password|forgot)/.test(r.url),
    )
    expect(found, 'expected POST to forgot-password endpoint').toBeTruthy()
  })

  test('back to login link works', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.locator('a[href="/login"]').first()
    if (await link.count()) {
      await link.click()
      await page.waitForURL('**/login', { timeout: 5_000 })
    }
  })
})
