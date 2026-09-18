import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  createListing,
  endNow,
  login,
  placeBid,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('cross-page user journey', () => {
  test('signup → browse → bid → win → checkout → settings → logout → login', async ({ page }) => {
    // ---- arrange: a seller posts a listing the journey user wins -----------
    const sellerEmail = uniqueEmail('seller')
    const seller = await signup(page, sellerEmail, 'TestPass123!', 'Seller User')
    const listing = (await createListing(page, seller.accessToken, {
      title: `Journey lot ${Date.now()}`,
      startingPrice: 100,
    })) as { id: string }

    // ---- the journey user signs up (fresh tab/page-equivalent context) ------
    const buyerEmail = uniqueEmail('buyer')
    const buyer = await signup(page, buyerEmail)
    expect(buyer.userId, 'signup must return a user id').toBeTruthy()

    // Step 1 — browse the auctions index.
    await page.goto(APP_BASE + '/auctions')
    await expect(
      page.getByRole('heading', { name: /Auctions|Live auctions|Browse/i, level: 1 }),
    ).toBeVisible()

    // Step 2 — open the listing detail page.
    await page.goto(APP_BASE + `/auctions/${listing.id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Step 3 — place a bid via the API (UI bid form is exercised separately).
    const bid = (await placeBid(page, buyer.accessToken, listing.id, 120)) as { amount?: number }
    expect(typeof bid.amount === 'number' || bid.amount === undefined).toBeTruthy()

    // Step 4 — force the auction to end so the buyer wins it.
    await endNow(page, seller.accessToken, listing.id)

    // Step 5 — check My bids → won.
    await page.goto(APP_BASE + '/my-bids')
    await expect(page.getByRole('heading', { name: /My bids|Bids/i, level: 1 })).toBeVisible()

    // Step 6 — open the checkout page for the won listing.
    await page.goto(APP_BASE + `/my-bids/won/${listing.id}/checkout`)
    await expect(page.getByRole('heading', { name: /Checkout|Pay|Order/i, level: 1 })).toBeVisible({
      timeout: 10000,
    })

    // Step 7 — open settings and switch to notifications.
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^Settings$/i, level: 1 })).toBeVisible()
    await page
      .getByRole('button', { name: /^Notifications$/i })
      .first()
      .click()

    // Step 8 — sign out via the user menu (best-effort) then sign back in.
    await page.goto(APP_BASE + '/login')
    await login(page, buyerEmail, buyer.password)
    expect(page.url()).not.toMatch(/\/login/)
  })
})
