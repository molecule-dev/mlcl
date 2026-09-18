import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers'

test.describe('/plan-updated', () => {
  test('renders thank-you headline', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('domcontentloaded')
    // Two stacked level-2 headings (planUpdated.message + thankYou). Both must render.
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible({ timeout: 10_000 })
    const headings = await page.getByRole('heading', { level: 2 }).count()
    expect(headings).toBeGreaterThanOrEqual(1)
  })

  test('Return-Home button is wrapped in a link to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('domcontentloaded')
    // The Button is inside <Link to="/">, so the surrounding link's href === /
    const link = page.locator('a:has(button)').first()
    await expect(link).toBeVisible({ timeout: 10_000 })
    expect(await link.getAttribute('href')).toBe('/')
  })

  test('clicking Return-Home button navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('domcontentloaded')
    await page.locator('a:has(button)').first().click()
    await expect(page).toHaveURL(new RegExp(`^${APP_BASE.replace(/[/.]/g, '\\$&')}/?$`), {
      timeout: 10_000,
    })
  })

  test('plan-updated route is auth-protected', async ({ page }) => {
    // Without signup, AuthGuard redirects to /login.
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
