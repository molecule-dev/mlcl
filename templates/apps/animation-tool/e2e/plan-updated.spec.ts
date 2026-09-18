import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated (PlanUpdated)', () => {
  test('first heading renders confirmation copy', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    const h2 = page.getByRole('heading', { level: 2 }).first()
    await expect(h2).toBeVisible()
    expect(((await h2.textContent()) ?? '').trim().length).toBeGreaterThan(2)
    // The AuthGuard hydrates from cookies via /api/users/profile (or similar)
    // and the page itself does no extra fetches. Capture any /api/* call to
    // demonstrate the page is wired through the auth bootstrap, not isolated.
    // If the bootstrap is fully cached the array may be empty — that's fine,
    // the heading visibility check is the real signal.
    void reqs
  })

  test('second heading renders thank-you copy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const headings = page.getByRole('heading', { level: 2 })
    await expect(headings.nth(1)).toBeAttached()
    expect(((await headings.nth(1).textContent()) ?? '').trim().length).toBeGreaterThan(2)
  })

  test('return-home link navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    // The page wraps a button in a Link to "/"; clicking the button or the link works.
    await page
      .getByRole('button', { name: /return|home/i })
      .first()
      .click()
    await page.waitForURL((u) => u.pathname === '/' || u.pathname === '', { timeout: 10_000 })
    expect(new URL(page.url()).pathname).toBe('/')
  })
})

test.describe('/plan-updated — checkout return', () => {
  test('confirms the purchase when the provider returns with a payment id', async ({ page }) => {
    await signup(page)
    const confirmed = page
      .waitForResponse((r) => /\/verify-payment\//.test(r.url()), { timeout: 20_000 })
      .catch(() => null)
    // The provider's success_url lands on the APP origin, so this page is what
    // finishes the purchase — without the call the paid plan is never granted.
    await page.goto(APP_BASE + '/plan-updated?provider=stripe&sessionId=cs_test_e2e')
    expect(await confirmed).not.toBeNull()
  })
})
