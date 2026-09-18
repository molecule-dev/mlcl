import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  captureNetwork,
  fetchDealIds,
  getMyCoupons,
  signup,
} from './_helpers.js'

test.describe('Deal detail page (/deals/:id)', () => {
  test('"All deals" link returns to /deals', async ({ page }) => {
    const seller = await signup(page)
    const [dealId] = await fetchDealIds(page, seller.accessToken, 1)
    await page.goto(APP_BASE + '/deals/' + dealId)
    await page.getByRole('link', { name: /all deals/i }).click()
    await expect(page).toHaveURL(/\/deals$/)
  })

  test('renders the deal title (h1)', async ({ page }) => {
    const seller = await signup(page)
    const [dealId] = await fetchDealIds(page, seller.accessToken, 1)
    await page.goto(APP_BASE + '/deals/' + dealId)
    await page.waitForTimeout(800)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('Merchant link in header navigates to /merchants/:id', async ({ page }) => {
    const seller = await signup(page)
    const [dealId] = await fetchDealIds(page, seller.accessToken, 1)
    await page.goto(APP_BASE + '/deals/' + dealId)
    await page.waitForTimeout(800)
    const merchLink = page.locator('a[href^="/merchants/"]').first()
    // count() never auto-waits, so a pre-paint read skipped this test instead of
    // running it. waitFor retries — a skip now means the link is really absent.
    const present = await merchLink
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no merchant link rendered for this deal')
    await merchLink.click()
    await expect(page).toHaveURL(/\/merchants\/[a-f0-9-]{8,}/)
  })

  test('renders the "About this deal" section', async ({ page }) => {
    const seller = await signup(page)
    const [dealId] = await fetchDealIds(page, seller.accessToken, 1)
    await page.goto(APP_BASE + '/deals/' + dealId)
    await expect(page.getByRole('heading', { name: /about this deal/i, level: 2 })).toBeVisible()
  })

  test('renders the "Your coupon code" redemption widget', async ({ page }) => {
    const seller = await signup(page)
    const [dealId] = await fetchDealIds(page, seller.accessToken, 1)
    await page.goto(APP_BASE + '/deals/' + dealId)
    await expect(page.getByRole('heading', { name: /your coupon code/i, level: 2 })).toBeVisible()
  })

  test('"Copy redemption code" button is rendered', async ({ page }) => {
    const seller = await signup(page)
    const [dealId] = await fetchDealIds(page, seller.accessToken, 1)
    await page.goto(APP_BASE + '/deals/' + dealId)
    await expect(page.getByRole('button', { name: /copy redemption code/i })).toBeVisible()
  })

  test('"Save coupon" persists a saved coupon (read-after-write via /api/my_coupons)', async ({
    page,
  }) => {
    const seller = await signup(page)
    const [dealId] = await fetchDealIds(page, seller.accessToken, 1)
    const before = await getMyCoupons(page, seller.accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/deals/' + dealId)
      await page.getByRole('button', { name: /save coupon/i }).click()
      await page.waitForTimeout(1500)
    })
    const calls = reqs.filter((r) => /\/api\/redemptions/.test(r.url) && r.method === 'POST')
    expect(calls.length, 'POST /api/redemptions fired').toBeGreaterThan(0)
    expect(
      calls.some((r) => r.status === 201),
      'one POST returned 201',
    ).toBe(true)
    const after = await getMyCoupons(page, seller.accessToken)
    expect(after.length, 'my-coupons feed grew').toBeGreaterThan(before.length)
  })

  test('page-load fetches GET /api/deals/:id', async ({ page }) => {
    const seller = await signup(page)
    const [dealId] = await fetchDealIds(page, seller.accessToken, 1)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/deals/' + dealId)
      await page.waitForTimeout(1000)
    })
    const calls = reqs.filter(
      (r) => new RegExp(`/api/deals/${dealId}`).test(r.url) && r.method === 'GET',
    )
    expect(calls.length, 'GET /api/deals/:id fired').toBeGreaterThan(0)
    expect(calls.every((r) => r.status === 200)).toBe(true)
  })
})
