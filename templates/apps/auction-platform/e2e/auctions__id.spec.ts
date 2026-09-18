import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, createListing, signup } from './_helpers.js'

test.describe('/auctions/:id', () => {
  test('renders listing title from /api/auctions/:id', async ({ page }) => {
    const seller = await signup(page)
    const listing = await createListing(page, seller.accessToken, { title: 'Detail Test Lot' })
    await page.goto(APP_BASE + '/auctions/' + listing.id)
    await expect(page.getByRole('heading', { name: /Detail Test Lot/i, level: 1 })).toBeVisible()
  })

  test('breadcrumb Auctions link returns to /auctions', async ({ page }) => {
    const seller = await signup(page)
    const listing = await createListing(page, seller.accessToken)
    await page.goto(APP_BASE + '/auctions/' + listing.id)
    await page
      .getByRole('link', { name: /^Auctions$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/auctions(?:#top|\/?)?$/)
  })

  test('bid amount field accepts input', async ({ page }) => {
    const seller = await signup(page)
    const listing = await createListing(page, seller.accessToken, { startingPrice: 100 })
    await page.goto(APP_BASE + '/auctions/' + listing.id)
    const sb = page.getByRole('spinbutton', { name: /Your bid/i })
    await sb.fill('200')
    await expect(sb).toHaveValue('200')
  })

  test('Place bid button issues POST /api/bids', async ({ page }) => {
    const seller = await signup(page)
    const listing = await createListing(page, seller.accessToken, { startingPrice: 100 })
    // Sign up as a different buyer so the bid is allowed (no self-bidding).
    const buyer = await signup(page)
    void buyer
    await page.goto(APP_BASE + '/auctions/' + listing.id)
    const sb = page.getByRole('spinbutton', { name: /Your bid/i })
    await sb.fill('120')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /Place bid/i })
        .first()
        .click()
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/bids(?:\?|$)/.test(r.url) && r.method === 'POST')).toBeTruthy()
  })

  test('page load fetches /api/auctions/:id', async ({ page }) => {
    const seller = await signup(page)
    const listing = await createListing(page, seller.accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/auctions/' + listing.id)
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/auctions\//.test(r.url) && r.method === 'GET')).toBeTruthy()
  })
})
