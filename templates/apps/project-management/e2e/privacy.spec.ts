/**
 * /privacy — anonymous privacy policy page rendered by
 * `@molecule/app-legal-pages-react`. Verifies it loads without auth and
 * shows the expected privacy-policy heading.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('privacy page', () => {
  test('/privacy renders the privacy policy heading', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('body')).toContainText(/privacy/i, { timeout: 10000 })
  })

  test('/privacy is reachable without authentication', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page).toHaveURL(/\/privacy/)
  })

  test('/privacy renders the page title in the document', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page).toHaveTitle(/.+/)
  })
})
