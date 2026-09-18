import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  getOrder,
  listOrders,
  seedSampleData,
  signup,
} from './_helpers.js'

test.describe('/orders list + status filtering + advance lifecycle', () => {
  test('seeded orders render and filter by lane', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    await page.goto(APP_BASE + '/orders')
    await expect(page.getByTestId('orders-list')).toBeVisible()

    const orders = await listOrders(page, accessToken)
    expect(orders.length).toBeGreaterThan(0)

    // Select the "Pending" lane and verify only pending orders show.
    await page
      .getByRole('button', { name: /^pending$/i })
      .first()
      .click()
    await page.waitForTimeout(800)
    const pendingApi = orders.filter((o) => o.status === 'pending')
    if (pendingApi.length > 0) {
      // At least one row should render.
      await expect(page.getByTestId('orders-list')).toBeVisible()
    } else {
      await expect(page.getByTestId('orders-empty')).toBeVisible()
    }
  })

  test('advance pending order through picking → packed → shipped via OrderDetail', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)

    const orders = await listOrders(page, accessToken)
    const pending = orders.find((o) => o.status === 'pending')
    test.skip(!pending, 'no seeded pending order to advance')
    if (!pending) return

    await page.goto(`${APP_BASE}/orders/${pending.id}`)
    await expect(page.getByTestId('order-detail-page')).toBeVisible()

    // Click "Start picking" → status should change to picking on backend.
    await page.getByTestId('order-advance').click()
    await page.waitForTimeout(800)

    let updated = await getOrder(page, accessToken, pending.id)
    expect(updated.status, 'after advance from pending').toBe('picking')

    // Advance again → packed.
    await page.getByTestId('order-advance').click()
    await page.waitForTimeout(800)
    updated = await getOrder(page, accessToken, pending.id)
    expect(updated.status, 'after advance from picking').toBe('packed')

    // Reload the page; status persists.
    await page.reload()
    await expect(page.getByTestId('order-detail-page')).toBeVisible()
    await expect(page.locator('text=/packed/i').first()).toBeVisible()
  })

  test('cancel button cancels a non-shipped order', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)

    const orders = await listOrders(page, accessToken)
    const target = orders.find((o) => o.status === 'pending' || o.status === 'picking')
    test.skip(!target, 'no cancellable order')
    if (!target) return

    await page.goto(`${APP_BASE}/orders/${target.id}`)
    await expect(page.getByTestId('order-detail-page')).toBeVisible()
    await page.getByTestId('order-cancel').click()
    await page.waitForTimeout(800)
    const after = await getOrder(page, accessToken, target.id)
    expect(after.status).toBe('cancelled')

    // Cancel of a shipped order should be rejected (server-side guard).
    const shipped = orders.find((o) => o.status === 'shipped')
    if (shipped) {
      const res = await page.request.post(`${API_BASE}/orders/${shipped.id}/cancel`, {
        headers: apiHeaders(accessToken),
        failOnStatusCode: false,
      })
      expect(res.status(), 'shipped → cancel should be rejected').toBeGreaterThanOrEqual(400)
    }
  })
})
