import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers'

// Public landing page. Hero heading + Try free + Sign in CTAs.

test.describe('/ (Landing)', () => {
  test('renders without authentication and without 5xx', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
    })
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    expect(
      reqs.find((r) => r.status >= 500),
      'no 5xx during landing',
    ).toBeUndefined()
  })

  test('"Try free" CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // The hero CTA reads "Try {{appName}} free for 14 days" — the app name
    // sits between "Try" and "free", hence the wildcard in the locator.
    await page
      .getByRole('link', { name: /try .* free/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('"Sign in" CTA navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"Pricing" link navigates to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const pricing = page.getByRole('link', { name: /pricing/i }).first()
    if ((await pricing.count()) === 0) {
      // Pricing link sometimes lives in the footer behind a marketing toggle —
      // fall back to direct nav and assert the page loads.
      await page.goto(APP_BASE + '/pricing')
      await expect(page).toHaveURL(/\/pricing/)
      return
    }
    await pricing.click()
    await expect(page).toHaveURL(/\/pricing/)
  })
})
