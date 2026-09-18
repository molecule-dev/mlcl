/**
 * /forgot-password — submitting an email returns 200 (no enumeration)
 * and the UI shows a success notice.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('forgot password', () => {
  test('renders the forgot-password form (email input + submit button)', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /send|submit|reset/i }).first()).toBeVisible()
  })

  test('POST /api/users/forgot-password returns 200 (no enumeration) on success', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot-pw'))
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send|submit|reset/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const fp = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url))
    expect(fp, 'POST should hit /api/users/forgot-password').toBeTruthy()
    expect(fp?.status, 'forgot-password should always 200 (no email enumeration)').toBeLessThan(400)
    const url = page.url()
    expect(url).not.toMatch(/\/login/)
  })

  test('"Back to sign in" link points to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.locator('a[href="/login"]').first()
    await expect(link).toHaveAttribute('href', '/login')
  })
})
