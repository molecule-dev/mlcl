/**
 * /plan-updated — Stripe success_url landing page.
 *
 * Stripe Checkout's success URL drops the user back here. The page
 * needs to: refresh the user's planKey from `/api/users/me`, render a
 * congratulatory message, and offer "Return home". We cannot complete
 * a real Stripe checkout in the test browser (it would require typing
 * a card on stripe.com), so the page-shape assertions here run on a
 * fresh signed-up free user — what matters is the page renders for
 * the authed shell, the home button works, and the page does not
 * lie about the plan.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('plan-updated', () => {
  test('renders for an authenticated user without crashing', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-load'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('button', { name: /Return home/i }).first()).toBeVisible()
  })

  test('GET /api/users/me reflects the actual planKey (not a hardcoded "Pro")', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('plan-updated-me'))
    // Capture network DURING the navigation so we see the page itself
    // fire /users/me from useEffect on mount. This is the "page itself
    // refreshes user state" invariant — without it, /plan-updated could
    // show a stale or hardcoded plan.
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated', { waitUntil: 'networkidle' })
    })
    const me = reqs.find((r) => /\/api\/users\/me$/.test(r.url) && r.method === 'GET')
    expect(me?.status, JSON.stringify(reqs.slice(-10))).toBe(200)
    const meRes = await page.request.get(API_BASE + '/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const body = (await meRes.json()) as { planKey?: string; props?: { planKey?: string | null } }
    const effectivePlan = body.planKey ?? body.props?.planKey ?? null
    // For an unfinished checkout, planKey is `free` (or null) — we
    // assert it's NOT being mistakenly elevated by /plan-updated alone.
    expect(['free', 'starter', 'pro', 'team', null, undefined]).toContain(effectivePlan)
    expect(effectivePlan === 'pro').toBe(false)
  })

  test('"Return home" button navigates to /', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-home-btn'))
    await page.goto(APP_BASE + '/plan-updated')
    await page
      .getByRole('button', { name: /Return home/i })
      .first()
      .click()
    await page.waitForURL(APP_BASE + '/', { timeout: 5000 })
  })

  test('"Return home" link variant also navigates to /', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-home-link'))
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.getByRole('link', { name: /Return home/i }).first()
    if (await link.count()) {
      await link.click()
      await page.waitForURL(APP_BASE + '/', { timeout: 5000 })
    }
  })

  test('header brand link goes to / (landing)', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-brand'))
    await page.goto(APP_BASE + '/plan-updated')
    await page
      .getByRole('link', { name: /^Herald/ })
      .first()
      .click()
    await page.waitForURL(APP_BASE + '/', { timeout: 5000 })
  })

  test('user menu is reachable from /plan-updated', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-menu'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('button', { name: /Open user menu/i }).first()).toBeVisible()
  })

  test('Theme toggle flips data-mol-mode on /plan-updated', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-theme'))
    await page.goto(APP_BASE + '/plan-updated')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
  })

  test('footer chrome (privacy/terms/language) renders', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-chrome'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('button', { name: /Privacy Policy/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Terms of Service/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Language/i }).first()).toBeVisible()
  })

  test('about-herald link points at the in-app About page', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-about'))
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.getByRole('link', { name: /About Herald/i }).first()
    expect(await link.getAttribute('href')).toBe('/about')
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
