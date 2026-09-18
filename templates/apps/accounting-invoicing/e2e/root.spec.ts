/**
 * / — public landing. Hero, feature grid, CTAs, navigation links.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('landing page', () => {
  test('hero + tagline render', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/small-business accounting/i)).toBeVisible()
  })

  test('"Sign in" link in nav navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .locator('nav')
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('"Start free trial" / "Get started" CTAs go to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .locator('nav')
      .getByRole('link', { name: /trial|get started/i })
      .first()
      .click()
    await page.waitForURL('**/signup', { timeout: 5000 })
  })

  test('feature grid renders 4 features', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const headings = page.locator('section').getByRole('heading', { level: 3 })
    await expect(headings).toHaveCount(4)
  })
})
