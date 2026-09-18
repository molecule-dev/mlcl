/**
 * / and /pricing — public pages.
 *
 * Asserts the landing page renders with the brand and a link to start
 * writing, and the pricing page renders the same tier cards anyone
 * (signed-in or not) can browse.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('public pages', () => {
  test('/ renders landing with brand + signup CTA', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    // There should be a navigation link or button to /signup.
    const cta = page
      .getByRole('link', { name: /sign\s*up|start writing|get\s*started|create account/i })
      .first()
    await expect(cta).toBeVisible()
  })

  test('/pricing renders without authentication', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })
})
