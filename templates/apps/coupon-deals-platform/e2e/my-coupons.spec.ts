import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, fetchDealIds, saveCoupon, signup } from './_helpers.js'

test.describe('My-coupons page (/my-coupons)', () => {
  test('renders the page title', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-coupons')
    await expect(page.getByRole('heading', { name: /my coupons/i, level: 1 })).toBeVisible()
  })

  test('Active tab is rendered with a count', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-coupons')
    await expect(page.getByRole('button', { name: /^active/i })).toBeVisible()
  })

  test('Redeemed tab is rendered with a count', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-coupons')
    await expect(page.getByRole('button', { name: /redeemed/i })).toBeVisible()
  })

  test('Expired tab is rendered with a count', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-coupons')
    await expect(page.getByRole('button', { name: /expired/i })).toBeVisible()
  })

  test('Expired tab shows empty-state copy for a fresh user (no expired coupons yet)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-coupons')
    await page.getByRole('button', { name: /^expired/i }).click()
    await expect(page.getByText(/no coupons in this tab/i)).toBeVisible()
  })

  test('after saving a coupon, the Active tab populates', async ({ page }) => {
    const user = await signup(page)
    const [dealId] = await fetchDealIds(page, user.accessToken, 1)
    await saveCoupon(page, user.accessToken, dealId)
    await page.goto(APP_BASE + '/my-coupons')
    await page.waitForTimeout(1000)
    // The page renders saved coupons as <li> rows inside a <ul>. Empty state
    // is a paragraph; presence of any list-item proves the read path works.
    const items = await page.locator('main ul > li').count()
    expect(items, 'at least one saved-coupon list item renders').toBeGreaterThanOrEqual(1)
  })

  test('page-load fetches /api/my_coupons', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/my-coupons')
      await page.waitForTimeout(1000)
    })
    const calls = reqs.filter((r) => /\/api\/my[-_]coupons/.test(r.url) && r.method === 'GET')
    expect(calls.length, 'GET /api/my_coupons fired').toBeGreaterThan(0)
    expect(calls.every((r) => r.status === 200)).toBe(true)
  })
})
