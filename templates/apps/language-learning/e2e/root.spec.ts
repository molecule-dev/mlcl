import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/', () => {
  test('renders the hero with the Parlance brand and CTAs', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('link', { name: /Parlance/i }).first()).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Start.*streak|Start free|Get started/i }).first(),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /Sign in/i }).first()).toBeVisible()
  })

  test('clicking Start CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Start.*streak|Start free|Get started/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/, { timeout: 10000 })
  })

  test('clicking Sign in navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^Sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('languages strip shows multiple supported languages', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // Check a few representative language flag/name pairs.
    await expect(page.getByText(/Spanish/i).first()).toBeVisible()
    await expect(page.getByText(/Japanese/i).first()).toBeVisible()
    await expect(page.getByText(/French/i).first()).toBeVisible()
  })

  test('the public landing page does not call any /api endpoints (no auth-gated prefetch)', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    // Landing should be statically renderable — no auth probes, no profile fetch.
    expect(
      apiCalls.length,
      `landing must not call /api on first paint, saw: ${apiCalls.map((c) => c.url).join(', ')}`,
    ).toBe(0)
  })
})
