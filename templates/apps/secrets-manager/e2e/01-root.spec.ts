import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers'

// Public marketing landing — Arcanum-branded "Secrets die in the open"
// page. Renders without auth and exposes Sign in + Start free CTAs and a
// Pricing link routed to /pricing.

test.describe('/ landing', () => {
  test('renders without auth and shows h1', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"Start free" CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start free/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('header "Pricing" link navigates to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^pricing$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/pricing$/)
  })
})
