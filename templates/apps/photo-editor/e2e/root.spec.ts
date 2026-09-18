/**
 * / (Landing) — public marketing surface.
 *
 * Asserts the headline + primary CTAs render and route correctly.
 * captureNetwork() is used to confirm no API calls fire on a cold load
 * of the marketing page (Landing must render entirely from local strings).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('root (/)', () => {
  test('renders the headline + primary CTAs without firing any /api requests', async ({ page }) => {
    const calls = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
    await expect(
      page.getByRole('link', { name: /start editing free|open lustra/i }).first(),
    ).toBeVisible()
    expect(calls.some((c) => c.url.includes('/api/'))).toBe(false)
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
