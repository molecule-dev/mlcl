/**
 * `/` — public marketing landing page. Verifies the hero copy renders,
 * the primary CTAs link to /signup and /login, and the page does not
 * require an authenticated session.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('landing page', () => {
  test('renders the product name in the hero (anonymous visitor)', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10_000 })
  })

  test('"Sign up" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign up|get started|start free/i }).first()
    await link.click()
    await page.waitForURL('**/signup', { timeout: 5_000 })
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign in|log in/i }).first()
    await link.click()
    await page.waitForURL('**/login', { timeout: 5_000 })
  })
})
