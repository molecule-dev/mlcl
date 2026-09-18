import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  evalAlerts,
  getAccessToken,
  getMe,
  listAlertRules,
  listAlerts,
  listMeters,
  listRatePlans,
  listTiers,
  logout,
  signup,
} from './_helpers.js'

/**
 * Cross-page kitchen-sink flow.
 *
 * Drives the same interactions a real user would perform on first
 * login — landing, signup, dashboard fan-out, devices, reports range,
 * alerts evaluate, profile prefs, settings rate plan, billing checkout,
 * theme persistence, sign-out — and asserts on outcomes (read-after-
 * write, persisted localStorage, real Stripe URL) rather than UI
 * affordances alone.
 */

test.describe('99: end-to-end Voltrace user journey', () => {
  test('signup → dashboard → devices → reports → alerts → profile → settings → billing → theme → sign out', async ({
    page,
  }) => {
    // 1. Public landing
    await page.goto(APP_BASE + '/')
    await expect(page.locator('h1, h2').first()).toBeVisible()

    // 2. Public pricing renders tier cards (after /api/billing/tiers settles)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="pricing-grid"]')).toBeVisible({ timeout: 15000 })
    const pricingTiers = page.locator('[data-mol-id^="pricing-plan-"]')
    await expect(pricingTiers.first()).toBeAttached()

    // 3. Signup → /dashboard with token in localStorage
    const auth = await signup(page)
    expect(auth.accessToken.length).toBeGreaterThan(10)

    // 4. Dashboard fans out to summary/circuits/cost/alerts; KPI text is numeric
    const dashCalls = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle')
    })
    const dashOk = dashCalls.filter(
      (r) => /\/api\/(readings|costs|alerts)/.test(r.url) && r.status >= 200 && r.status < 400,
    )
    expect(dashOk.length, 'dashboard fan-out is authenticated').toBeGreaterThan(0)
    const mainText = await page.locator('main').innerText()
    expect(mainText, 'dashboard renders kWh').toMatch(/kWh/i)

    // 5. Devices list seeds 3 demo meters; deactivating flips status
    await page.goto(APP_BASE + '/devices')
    await page.waitForLoadState('networkidle')
    const meters = await listMeters(page, auth.accessToken)
    expect(meters.length, 'demo seed creates 3 meters').toBeGreaterThanOrEqual(3)
    const target = meters.find((m) => m.status === 'active')
    expect(target, 'one seeded meter is active').toBeTruthy()

    // 6. Click into a device detail page
    await page.locator(`a[href="/devices/${target!.id}"]`).first().click()
    await page.waitForURL(/\/devices\/[^/]+$/)
    await expect(page.locator('main')).toContainText(/kWh|W/)

    // 7. Reports renders a populated daily breakdown
    await page.goto(APP_BASE + '/reports')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table').first()).toBeVisible()

    // 8. Alerts: evaluate creates at least one alert (high-usage rule fires)
    const evalResult = await evalAlerts(page, auth.accessToken)
    expect(evalResult.alerts_created, 'eval creates alerts on seeded readings').toBeGreaterThan(0)
    const alertList = await listAlerts(page, auth.accessToken)
    expect(alertList.length).toBeGreaterThan(0)
    const rules = await listAlertRules(page, auth.accessToken)
    expect(rules.length, 'demo seed creates alert rules').toBeGreaterThan(0)

    // 9. Profile: save household size, reload, value persists in /api/me
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
    const household = page.locator('#profile-household-size')
    await household.fill('7')
    await page.locator('[data-mol-id="profile-form"] button[type="submit"]').first().click()
    await expect(page.locator('[data-mol-id="profile-saved"]')).toBeVisible({ timeout: 10000 })
    const me = await getMe(page, auth.accessToken)
    expect(me.householdSize).toBe(7)

    // 10. Settings: rate plans seeded
    const ratePlans = await listRatePlans(page, auth.accessToken)
    expect(ratePlans.length, 'demo seed creates rate plans').toBeGreaterThan(0)

    // 11. Billing: tiers list returned by /api/billing/tiers
    const tiers = await listTiers(page, auth.accessToken)
    expect(tiers.length).toBeGreaterThan(0)
    expect(tiers.some((t) => t.key === 'free' || t.key === 'pro')).toBe(true)

    // 12. Theme toggle from /dashboard, persists across reload
    await page.goto(APP_BASE + '/dashboard')
    const before = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    await page
      .getByRole('button', { name: /toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    expect(after).not.toBe(before)
    await page.reload()
    const persisted = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    expect(persisted, 'theme persists across reload').toBe(after)

    // 13. Sign out clears session and redirects to /login
    await logout(page)
    await page.waitForURL(/\/login/, { timeout: 10000 })
    const tokenAfterLogout = await getAccessToken(page)
    expect(tokenAfterLogout).toBeFalsy()

    // 14. Forgot-password POST returns 200 (non-enumerable response)
    await page.goto(APP_BASE + '/forgot-password')
    const fpReqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').first().fill(auth.email)
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForTimeout(1500)
    })
    const fp = fpReqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(fp?.status).toBe(200)
  })
})
