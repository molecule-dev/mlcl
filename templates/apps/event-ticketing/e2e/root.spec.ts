import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
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
    // Collecting listener attached at TEST START: responses are pushed as
    // they arrive, and expect.poll absorbs any delivery hiccup under heavy
    // parallel load (an armed waitForResponse can miss a response that lands
    // within its install window on a busy machine).
    const apiResponses: { method: string; url: string; status: number }[] = []
    page.on('response', (r) => {
      if (/\/api\//.test(r.url()))
        apiResponses.push({ method: r.request().method(), url: r.url(), status: r.status() })
    })
    await page.goto(APP_BASE + '/')
    await expect
      .poll(() => apiResponses.some((r) => r.method === 'GET' && /\/api\/events/.test(r.url)), {
        message: 'GET /api/events should fire on landing',
      })
      .toBeTruthy()
    const ev = apiResponses.find((r) => r.method === 'GET' && /\/api\/events/.test(r.url))
    expect(ev?.status, 'GET /api/events status').toBeLessThan(500)
  })
})
