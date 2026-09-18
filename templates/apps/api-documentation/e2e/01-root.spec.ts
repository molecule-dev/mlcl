import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers'

// Public landing page. Visible without auth. Three primary affordances:
// hero heading, "Try free" CTA → /signup, "Sign in" CTA → /login.

test.describe('/ (Landing)', () => {
  test('renders hero heading without authentication', async ({ page }) => {
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
    await page
      .getByRole('link', { name: /try free/i })
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
})
