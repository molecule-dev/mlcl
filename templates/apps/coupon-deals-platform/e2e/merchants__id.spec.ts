import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, fetchMerchantIds, signup } from './_helpers.js'

test.describe('Merchant detail page (/merchants/:id)', () => {
  test('"All merchants" link returns to /merchants', async ({ page }) => {
    const seller = await signup(page)
    const [merchId] = await fetchMerchantIds(page, seller.accessToken, 1)
    await page.goto(APP_BASE + '/merchants/' + merchId)
    await page.getByRole('link', { name: /all merchants/i }).click()
    await expect(page).toHaveURL(/\/merchants$/)
  })

  test('renders the merchant name (h1)', async ({ page }) => {
    const seller = await signup(page)
    const [merchId] = await fetchMerchantIds(page, seller.accessToken, 1)
    await page.goto(APP_BASE + '/merchants/' + merchId)
    await page.waitForTimeout(800)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('renders the "Active deals" section', async ({ page }) => {
    const seller = await signup(page)
    const [merchId] = await fetchMerchantIds(page, seller.accessToken, 1)
    await page.goto(APP_BASE + '/merchants/' + merchId)
    await expect(page.getByRole('heading', { name: /active deals/i, level: 2 })).toBeVisible()
  })

  test('clicking one of the merchant deals navigates to /deals/:id', async ({ page }) => {
    const seller = await signup(page)
    const [merchId] = await fetchMerchantIds(page, seller.accessToken, 1)
    await page.goto(APP_BASE + '/merchants/' + merchId)
    await page.waitForTimeout(800)
    const dealLink = page.locator('a[href^="/deals/"]').first()
    // count() never auto-waits, so a pre-paint read skipped this test instead of
    // running it. waitFor retries — a skip now means there really are no deals.
    const present = await dealLink
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'merchant has no active deals to drill into')
    await dealLink.click()
    await expect(page).toHaveURL(/\/deals\/[a-f0-9-]{8,}/)
  })

  test('renders the Contact side rail', async ({ page }) => {
    const seller = await signup(page)
    const [merchId] = await fetchMerchantIds(page, seller.accessToken, 1)
    await page.goto(APP_BASE + '/merchants/' + merchId)
    await expect(page.getByRole('heading', { name: 'Contact', level: 2 })).toBeVisible()
  })

  test('renders the Hours side rail', async ({ page }) => {
    const seller = await signup(page)
    const [merchId] = await fetchMerchantIds(page, seller.accessToken, 1)
    await page.goto(APP_BASE + '/merchants/' + merchId)
    await expect(page.getByRole('heading', { name: 'Hours', level: 2 })).toBeVisible()
  })

  test('page-load fetches /api/merchants/:id and /api/deals?merchant_id=:id', async ({ page }) => {
    const seller = await signup(page)
    const [merchId] = await fetchMerchantIds(page, seller.accessToken, 1)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/merchants/' + merchId)
      await page.waitForTimeout(1000)
    })
    const merchCalls = reqs.filter(
      (r) => new RegExp(`/api/merchants/${merchId}`).test(r.url) && r.method === 'GET',
    )
    const dealsCalls = reqs.filter(
      (r) => new RegExp(`/api/deals\\?merchant_id=${merchId}`).test(r.url) && r.method === 'GET',
    )
    expect(merchCalls.length, 'merchant GET fired').toBeGreaterThan(0)
    expect(dealsCalls.length, 'deals?merchant_id GET fired').toBeGreaterThan(0)
  })
})
