import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE } from './_helpers'

// Public marketing landing — Cairn-branded "Stack knowledge" copy from
// the Pennant template. Has Sign in + Start a workspace CTAs that route
// to /login and /signup respectively.

test.describe('/ landing', () => {
  test('renders without auth and shows brand mark', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('"Sign in" link in header navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('primary CTA "Start free" navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start free/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('header Pricing link navigates to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^pricing$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/pricing$/)
  })

  test('"Choose plan" cards in pricing section route to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /choose plan/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
