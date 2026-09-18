import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  createListing,
  endNow,
  placeBid,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/my-bids/won/:id/checkout', () => {
  /**
   * Full read-after-write setup: a seller creates a listing, a winner
   * bids, the seller force-ends, then the winner navigates to the
   * checkout page in the browser to exercise GET /api/checkout/:id.
   */
  async function arrangeWonListing(browser: import('@playwright/test').Browser) {
    const sellerCtx = await browser.newContext()
    const sellerPage = await sellerCtx.newPage()
    const seller = await signup(sellerPage, uniqueEmail('seller'))
    const listing = await createListing(sellerPage, seller.accessToken, {
      title: 'Won Lot Test',
      startingPrice: 100,
    })

    const winnerCtx = await browser.newContext()
    const winnerPage = await winnerCtx.newPage()
    const winner = await signup(winnerPage, uniqueEmail('winner'))
    await placeBid(winnerPage, winner.accessToken, String(listing.id), 200)
    await endNow(sellerPage, seller.accessToken, String(listing.id))

    await sellerCtx.close()
    return { winnerCtx, winnerPage, listingId: String(listing.id) }
  }

  test('renders You won heading for winning bidder', async ({ browser }) => {
    const { winnerCtx, winnerPage, listingId } = await arrangeWonListing(browser)
    await winnerPage.goto(APP_BASE + `/my-bids/won/${listingId}/checkout`)
    await expect(
      winnerPage.getByRole('heading', { name: /You won|Pay to claim/i, level: 1 }),
    ).toBeVisible()
    await winnerCtx.close()
  })

  test('Insured ground shipping radio is selectable', async ({ browser }) => {
    const { winnerCtx, winnerPage, listingId } = await arrangeWonListing(browser)
    await winnerPage.goto(APP_BASE + `/my-bids/won/${listingId}/checkout`)
    await expect(winnerPage.getByRole('radio', { name: /Insured ground/i })).toBeVisible()
    await winnerCtx.close()
  })

  test('Insured express shipping radio toggles checked', async ({ browser }) => {
    const { winnerCtx, winnerPage, listingId } = await arrangeWonListing(browser)
    await winnerPage.goto(APP_BASE + `/my-bids/won/${listingId}/checkout`)
    const r = winnerPage.getByRole('radio', { name: /Insured express/i })
    // Native radios are sr-only; the wrapping <label> is the actual click
    // target for sighted users. Click the label by its text to drive the
    // implicit-label association, which fires React's onChange.
    await winnerPage
      .getByText(/Insured express/i)
      .first()
      .click()
    await expect(r).toBeChecked()
    await winnerCtx.close()
  })

  test('page load fetches /api/checkout/:id', async ({ browser }) => {
    const { winnerCtx, winnerPage, listingId } = await arrangeWonListing(browser)
    const reqs = await captureNetwork(winnerPage, async () => {
      await winnerPage.goto(APP_BASE + `/my-bids/won/${listingId}/checkout`)
      await winnerPage.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/checkout\//.test(r.url) && r.method === 'GET')).toBeTruthy()
    await winnerCtx.close()
  })
})
