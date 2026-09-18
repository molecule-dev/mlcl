import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  seedEvent,
  seedOrder,
  seedTier,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/ landing', () => {
  test('renders Discover heading and Browse events CTA', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('link', { name: /browse events/i }).first()).toBeVisible()
  })

  test('Browse events CTA links to /events', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /browse events/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/events/)
  })

  test('Create account / sign-up CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const signupLink = page.locator('a[href="/signup"]').first()
    await signupLink.click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('Sign in footer link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const loginLink = page.locator('a[href="/login"]').first()
    await loginLink.click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('hits GET /api/events to populate the on-sale strip', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
    const ev = reqs.find((r) => r.method === 'GET' && /\/api\/events/.test(r.url))
    expect(ev, 'GET /api/events should fire on landing').toBeTruthy()
    expect(ev?.status).toBeLessThan(500)
  })
})
