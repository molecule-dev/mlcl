import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  captureNetwork,
  fetchDealIds,
  fetchMerchantIds,
  getMyCoupons,
  getNotifications,
  signup,
  uniqueEmail,
  API_BASE,
} from './_helpers.js'

/**
 * Cross-page kitchen-sink user journey: a fresh deal-hunter's first
 * session covering signup → dashboard discovery → browse deals →
 * deal-detail save → my-coupons reflects → near-me discovery →
 * merchant browse → settings update → log out → log back in.
 *
 * Asserts read-after-write invariants at every step (server state
 * matches what the UI showed).
 */

test.describe('Kitchen-sink user journey', () => {
  test('fresh deal-hunter saves a coupon, updates settings, logs out and back in', async ({
    page,
  }) => {
    // 1. Sign up — lands on /dashboard, server has a new user.
    const user = await signup(page, uniqueEmail('journey'))
    await expect(page).toHaveURL(/\/dashboard$/)

    // Dashboard loads stats + deals.
    const dashboardReqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForTimeout(1500)
    })
    const stats = dashboardReqs.find((r) => /\/api\/reports\/dashboard_stats/.test(r.url))
    expect(stats, '/api/reports/dashboard_stats fired on dashboard load').toBeTruthy()

    // 2. Browse deals.
    await page.goto(APP_BASE + '/deals')
    await page.waitForTimeout(800)
    expect(await page.getByRole('listitem').count()).toBeGreaterThanOrEqual(3)

    // 3. Drill into a deal and save the coupon — read-after-write
    // verifies /api/my_coupons grew.
    const [dealId] = await fetchDealIds(page, user.accessToken, 1)
    const beforeCoupons = await getMyCoupons(page, user.accessToken)
    await page.goto(APP_BASE + '/deals/' + dealId)
    await page.getByRole('button', { name: /save coupon/i }).click()
    await page.waitForTimeout(1500)
    const afterCoupons = await getMyCoupons(page, user.accessToken)
    expect(afterCoupons.length, 'my_coupons grew after save').toBeGreaterThan(beforeCoupons.length)

    // 4. Visit /my-coupons — feed should reflect the saved coupon.
    await page.goto(APP_BASE + '/my-coupons')
    await page.waitForTimeout(800)
    // MyCoupons renders saved coupons as <li> rows in a <ul>.
    expect(await page.locator('main ul > li').count()).toBeGreaterThanOrEqual(1)

    // 5. Near-me page renders distance-sorted deals.
    await page.goto(APP_BASE + '/near-me')
    await page.waitForTimeout(800)
    expect(await page.getByText(/km away/i).count()).toBeGreaterThanOrEqual(3)

    // 6. Merchants list + drill into one.
    await page.goto(APP_BASE + '/merchants')
    await page.waitForTimeout(800)
    expect(await page.getByRole('listitem').count()).toBeGreaterThanOrEqual(3)
    const [merchId] = await fetchMerchantIds(page, user.accessToken, 1)
    await page.goto(APP_BASE + '/merchants/' + merchId)
    await expect(page.getByRole('heading', { name: /active deals/i, level: 2 })).toBeVisible()

    // 7. Notifications page renders without error.
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i, level: 1 })).toBeVisible()
    const notifs = await getNotifications(page, user.accessToken)
    expect(Array.isArray(notifs), '/api/notifications returns an array').toBe(true)

    // 8. Settings: change display name, persist to /api/users/:id.
    await page.goto(APP_BASE + '/settings')
    const newName = 'Journey Hero ' + Date.now()
    await page.getByLabel('Display name').fill(newName)
    await page.getByLabel('City').fill('Brooklyn')
    await page.getByRole('button', { name: /save profile/i }).click()
    await page.waitForTimeout(1500)
    const reread = await page.request.get(`${API_BASE}/users/${user.userId}`, {
      headers: apiHeaders(user.accessToken),
    })
    expect(reread.status()).toBe(200)
    const body = (await reread.json()) as Record<string, unknown> & {
      props?: Record<string, unknown>
    }
    const name =
      (body.name as string | undefined) ?? (body.props?.name as string | undefined) ?? null
    expect(name, 'name persisted server-side').toBe(newName)

    // 9. Log out (clear cookies + storage), then log back in via the form.
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.getByLabel('Email address').fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill(user.password)
    await page.getByRole('button', { name: /sign in to snag/i }).click()
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/dashboard$/)

    // 10. Re-fetch /api/my_coupons after re-login — saved coupon still there.
    const afterLogin = await getMyCoupons(page, user.accessToken)
    expect(afterLogin.length, 'saved coupon persisted across logout/login').toBe(
      afterCoupons.length,
    )
  })
})
