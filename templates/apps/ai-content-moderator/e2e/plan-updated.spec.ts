/**
 * /plan-updated — post-checkout landing page. Renders confirmation
 * + a "return home" link to /.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('plan updated page', () => {
  test('renders confirmation and a "return home" link', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    // Default message + thank-you string from i18n fallbacks.
    await expect(page.locator('h2').first()).toBeVisible()
    const link = page.getByRole('link', { name: /return|home/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/')
  })

  test('clicking return home navigates back to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.getByRole('link', { name: /return|home/i }).click()
    await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/dashboard', {
      timeout: 5000,
    })
  })
})
