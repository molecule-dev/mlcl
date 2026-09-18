import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors } from './_helpers.js'

test.describe('landing page (/)', () => {
  test('renders the brand link', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('link', { name: /wavelength/i }).first()).toBeVisible()
  })

  test('navbar "Sign in" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('navbar "Try free" link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /try free/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('hero "Start listening — free" CTA routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start listening/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('hero secondary CTA routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // Hero section has two visible "Sign in" affordances; either is fine.
    await page
      .getByRole('link', { name: /^sign in$/i })
      .nth(1)
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('bottom-page CTA routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const ctas = page.getByRole('link', { name: /start listening/i })
    await ctas.last().click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('landing renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
  })

  test('public landing makes no privileged /api/ calls (anonymous read)', async ({ page }) => {
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
    // Marketing landing must not depend on the API at all — that's the
    // contract for public, no-auth routes. Anything 4xx/5xx is a bug.
    const apiErrors = requests.filter((r) => /\/api\//.test(r.url) && r.status >= 400)
    expect(apiErrors).toEqual([])
  })
})
