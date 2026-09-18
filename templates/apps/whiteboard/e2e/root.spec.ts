import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers'

test.describe('/ — public landing page', () => {
  test('renders the brand mark, hero, and primary CTAs', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      // Brand mark in header
      await expect(page.locator('a[href="/"]').first()).toBeVisible()
      // Hero text contains a tagline
      await expect(page.locator('h1, h2').first()).toBeVisible()
      // Templates and Pricing nav
      await expect(page.locator('a[href="/templates"]').first()).toBeVisible()
      await expect(page.locator('a[href="/pricing"]').first()).toBeVisible()
    })
    // Public landing must NOT issue authenticated /api/* calls; the only network
    // traffic should be the SPA shell + assets. Observation contract = no surprise
    // /api/users/* calls during anonymous landing render.
    const apiCalls = reqs.filter((r) => /\/api\/(?:users|boards|billing)\//.test(r.url))
    expect(
      apiCalls.length,
      `landing page issued unexpected /api/* calls: ${JSON.stringify(apiCalls.slice(0, 3))}`,
    ).toBe(0)
  })

  test('"Sign in" / "Get started" header links navigate', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const loginLink = page.locator('a[href="/login"]').first()
    await loginLink.click()
    await expect(page).toHaveURL(/\/login/)
    await page.goBack()
    const signupLink = page.locator('a[href="/signup"]').first()
    if (await signupLink.count().catch(() => 0)) {
      await signupLink.click()
      await expect(page).toHaveURL(/\/signup/)
    }
  })

  test('feature cards render (infinite canvas, multiplayer cursors, templates, history)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    // Match any of the four feature blurbs by partial body copy.
    await expect(
      page.getByText(/infinite canvas|multiplayer|templates|history/i).first(),
    ).toBeVisible()
  })

  test('does not require auth — a fresh, no-cookie browser sees the landing page', async ({
    page,
    context,
  }) => {
    await context.clearCookies()
    const resp = await page.goto(APP_BASE + '/')
    expect(resp?.status()).toBeLessThan(500)
    await expect(page).toHaveURL(/\/$/)
  })
})
