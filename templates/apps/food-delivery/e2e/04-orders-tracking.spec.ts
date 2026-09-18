import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  createOwnedRestaurant,
  placeOrderAtOwnedRestaurant,
  placeOrderViaApi,
  signup,
  uniqueEmail,
} from './_helpers.js'

/**
 * Orders, tracking, cancel, and rate flows.
 *
 * Invariants verified:
 * - GET /orders returns the placed order; UI Orders page renders it.
 * - GET /orders/:id returns the order's details.
 * - /order/:id (tracking) renders the status timeline at the right step.
 * - A buyer may cancel their OWN still-`placed` order (POST /orders/:id/cancel).
 * - MERCHANT gating (M6-1): advancing an order into a merchant state via
 *   PUT /orders/:id/status is restricted to the restaurant OWNER — a plain
 *   buyer is 403'd; the restaurant owner can.
 * - POST /orders/:id/rate creates an order_review for delivered orders.
 */

test.describe('orders / tracking', () => {
  test('orders list renders the placed order with status pill and Track CTA', async ({ page }) => {
    await signup(page, uniqueEmail('fd-orders-list'))
    const placed = await placeOrderViaApi(page)
    expect(placed.order.id).toBeTruthy()

    await page.goto(APP_BASE + '/orders')
    await expect(page.getByRole('heading', { name: /Your orders/i })).toBeVisible()
    await expect(page.getByText(placed.restaurant.name).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Track/i }).first()).toBeVisible()
  })

  test('order tracking shows the eta + status timeline', async ({ page }) => {
    await signup(page, uniqueEmail('fd-track'))
    const placed = await placeOrderViaApi(page)
    await page.goto(APP_BASE + `/order/${placed.order.id}`)
    await expect(page.getByText(/Arriving in/i)).toBeVisible()
    // Status timeline should show "Order placed" current step.
    await expect(page.getByText(/Order placed/i).first()).toBeVisible()
  })

  test('tracking page links to /orders/:id so an in-flight order can be cancelled', async ({
    page,
  }) => {
    // The tracking view (the screen the user lands on after placing an order)
    // must expose a path to the OrderDetail page where the cancel section
    // lives — otherwise the user has no in-app way to cancel an active
    // order between placing it and the restaurant moving past confirmed.
    await signup(page, uniqueEmail('fd-track-manage'))
    const placed = await placeOrderViaApi(page)
    await page.goto(APP_BASE + `/order/${placed.order.id}`)
    const manage = page.getByTestId('tracking-manage-link')
    await expect(manage).toBeVisible()
    await expect(manage).toHaveAttribute('href', `/orders/${placed.order.id}`)
    await manage.click()
    await expect(page).toHaveURL(new RegExp(`/orders/${placed.order.id}$`))
    await expect(page.getByTestId('cancel-section')).toBeVisible()
  })

  test('cancelling an order persists status=cancelled in the backend', async ({ page }) => {
    await signup(page, uniqueEmail('fd-cancel'))
    const placed = await placeOrderViaApi(page)
    await page.goto(APP_BASE + `/orders/${placed.order.id}`)

    await expect(page.getByTestId('cancel-section')).toBeVisible()
    const cancelPromise = page.waitForResponse(
      (r) => /\/api\/orders\/[\w-]+\/cancel/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await page.getByTestId('cancel-order').click()
    await cancelPromise

    // Read-after-write: GET /orders/:id reflects status='cancelled'.
    const resp = await page.request.get(API_BASE + `/orders/${placed.order.id}`)
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body?.data?.status).toBe('cancelled')

    // UI section should disappear after reload (no longer cancellable).
    await page.reload()
    await expect(page.getByTestId('cancel-section')).toHaveCount(0)
  })

  test('a plain buyer is 403 on merchant ops; the restaurant owner can drive them', async ({
    browser,
  }) => {
    // MERCHANT context: signs up and creates a restaurant + menu item they own.
    const merchantCtx = await browser.newContext()
    const merchantPage = await merchantCtx.newPage()
    await signup(merchantPage, uniqueEmail('fd-merchant'))
    const { restaurantId, menuItemId } = await createOwnedRestaurant(merchantPage)

    // BUYER context: a different user signs up and orders from that restaurant.
    const buyerCtx = await browser.newContext()
    const buyerPage = await buyerCtx.newPage()
    await signup(buyerPage, uniqueEmail('fd-buyer'))
    const order = await placeOrderAtOwnedRestaurant(buyerPage, restaurantId, menuItemId)
    expect(order.id).toBeTruthy()

    try {
      // The BUYER (order owner) must NOT be able to advance into a merchant state.
      const buyerAttempt = await buyerPage.request.put(API_BASE + `/orders/${order.id}/status`, {
        data: { status: 'preparing' },
      })
      expect(buyerAttempt.status()).toBe(403)

      // The restaurant OWNER (merchant) can.
      const merchantSet = await merchantPage.request.put(API_BASE + `/orders/${order.id}/status`, {
        data: { status: 'preparing' },
      })
      expect(merchantSet.status()).toBe(200)
    } finally {
      await merchantCtx.close()
      await buyerCtx.close()
    }
  })

  test('rating a delivered order writes an order_review row', async ({ browser }) => {
    // Merchant owns the restaurant; only the merchant may move the order to
    // 'delivered'. The buyer then rates their own delivered order.
    const merchantCtx = await browser.newContext()
    const merchantPage = await merchantCtx.newPage()
    await signup(merchantPage, uniqueEmail('fd-rate-merchant'))
    const { restaurantId, menuItemId } = await createOwnedRestaurant(merchantPage)

    const buyerCtx = await browser.newContext()
    const buyerPage = await buyerCtx.newPage()
    await signup(buyerPage, uniqueEmail('fd-rate-buyer'))
    const order = await placeOrderAtOwnedRestaurant(buyerPage, restaurantId, menuItemId)

    try {
      // Merchant (restaurant owner) advances the order to delivered.
      const setDelivered = await merchantPage.request.put(API_BASE + `/orders/${order.id}/status`, {
        data: { status: 'delivered' },
      })
      expect(setDelivered.status()).toBe(200)

      // The buyer rates their delivered order from the OrderDetail page.
      await buyerPage.goto(APP_BASE + `/orders/${order.id}`)
      await expect(buyerPage.getByTestId('rate-section')).toBeVisible()

      await buyerPage.getByTestId('rate-star-5').click()
      const ratePromise = buyerPage.waitForResponse(
        (r) => /\/api\/orders\/[\w-]+\/rate/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 10_000 },
      )
      await buyerPage.getByTestId('rate-submit').click()
      const rateResp = await ratePromise
      expect([200, 201]).toContain(rateResp.status())

      // Confirmation in UI.
      await expect(buyerPage.getByTestId('rate-saved')).toBeVisible()

      // Read-after-write: the restaurant's review_count should be >=1.
      const restResp = await buyerPage.request.get(API_BASE + `/restaurants/${restaurantId}`)
      expect(restResp.status()).toBe(200)
      const rest = (await restResp.json())?.data
      expect(rest.review_count).toBeGreaterThanOrEqual(1)
    } finally {
      await merchantCtx.close()
      await buyerCtx.close()
    }
  })

  test('cancel section is hidden once order is past confirmed', async ({ browser }) => {
    // The restaurant owner (merchant) bumps the order past `placed`; the buyer's
    // OrderDetail then hides the cancel section (buyer can only cancel `placed`).
    const merchantCtx = await browser.newContext()
    const merchantPage = await merchantCtx.newPage()
    await signup(merchantPage, uniqueEmail('fd-cancel-late-merchant'))
    const { restaurantId, menuItemId } = await createOwnedRestaurant(merchantPage)

    const buyerCtx = await browser.newContext()
    const buyerPage = await buyerCtx.newPage()
    await signup(buyerPage, uniqueEmail('fd-cancel-late-buyer'))
    const order = await placeOrderAtOwnedRestaurant(buyerPage, restaurantId, menuItemId)

    try {
      const bumped = await merchantPage.request.put(API_BASE + `/orders/${order.id}/status`, {
        data: { status: 'preparing' },
      })
      expect(bumped.status()).toBe(200)

      await buyerPage.goto(APP_BASE + `/orders/${order.id}`)
      await expect(buyerPage.getByTestId('cancel-section')).toHaveCount(0)
    } finally {
      await merchantCtx.close()
      await buyerCtx.close()
    }
  })
})
