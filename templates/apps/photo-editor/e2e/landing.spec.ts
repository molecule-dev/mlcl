/**
 * / (Landing) — public marketing surface.
 *
 * Asserts navigation links land on the right routes and that the
 * "Open Lustra" / "Sign in" buttons are wired (not anchor placeholders).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE } from './_helpers.js'

test.describe('landing', () => {
  test('renders the headline + primary CTAs', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
    await expect(
      page.getByRole('link', { name: /open lustra|start editing free/i }).first(),
    ).toBeVisible()
  })

  test('clicking "Sign in" routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await page.waitForURL(/\/login/)
  })

  test('clicking the primary "Start editing free" CTA routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start editing free|open lustra/i })
      .first()
      .click()
    await page.waitForURL(/\/signup/)
  })
})
