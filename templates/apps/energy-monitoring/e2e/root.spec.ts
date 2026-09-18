import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('Landing /', () => {
  test('renders product hero and sign-in CTAs without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.locator('h1, h2').first()).toBeVisible()
    const signInCount = await page.getByRole('link', { name: /sign in/i }).count()
    expect(signInCount, '/ has a Sign-in link').toBeGreaterThan(0)
  })

  test('Sign in CTA routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('signup CTA routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const cta = page.getByRole('link', {
      name: /plug in voltrace|get started|sign up|create account/i,
    })
    if ((await cta.count()) > 0) {
      await cta.first().click()
      await expect(page).toHaveURL(/\/(signup|register)$/)
    } else {
      // Some hero variants put the primary CTA in a button — fall back to
      // checking that at least one link to /signup exists somewhere.
      const links = await page.locator('a[href="/signup"]').count()
      expect(links).toBeGreaterThan(0)
    }
  })

  test('public landing performs no /api/me fetch (no auth-required calls)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const me = reqs.find((r) => /\/api\/me\b/.test(r.url))
    expect(me, 'public / should not fetch /api/me').toBeUndefined()
  })
})
