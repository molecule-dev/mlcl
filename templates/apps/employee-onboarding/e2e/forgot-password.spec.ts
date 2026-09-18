/**
 * Forgot-password posts to /api/users/forgot-password and shows confirmation
 * regardless of email existence (anti-enumeration).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders the email input + submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.getByRole('button').first()).toBeVisible()
  })

  test('submit POSTs /api/users/forgot-password and returns 2xx', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('fp'))
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset|send|continue/i })
        .first()
        .click()
      await page.waitForTimeout(2000)
    })
    const fp = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST')
    expect(fp?.status, 'forgot-password POST should succeed').toBeLessThan(400)
  })

  test('back-to-login link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in|back/i }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/login|\/$/, { timeout: 10_000 })
    }
  })
})
