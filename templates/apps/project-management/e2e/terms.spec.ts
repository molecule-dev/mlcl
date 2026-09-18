/**
 * /terms — anonymous terms-of-service page rendered by
 * `@molecule/app-legal-pages-react`. Verifies it loads without auth.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('terms page', () => {
  test('/terms renders the terms heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('body')).toContainText(/terms/i, { timeout: 10000 })
  })

  test('/terms is reachable without authentication', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page).toHaveURL(/\/terms/)
  })

  test('/terms renders the page title in the document', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page).toHaveTitle(/.+/)
  })
})
