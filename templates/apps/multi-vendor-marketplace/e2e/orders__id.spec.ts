import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/orders', () => {
  test('order detail renders header', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/orders')
    const ordersRes = await page.request.get(APP_BASE + '/api/orders')
    const { data } = await ordersRes.json()
    test.skip(!data?.length, 'no orders for user')
    await page.goto(APP_BASE + '/orders/' + data[0].id)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('back link returns to /orders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/orders')
    const ordersRes = await page.request.get(APP_BASE + '/api/orders')
    const { data } = await ordersRes.json()
    test.skip(!data?.length, 'no orders for user')
    await page.goto(APP_BASE + '/orders/' + data[0].id)
    await page.getByRole('link', { name: /Back to all orders/i }).click()
    await expect(page).toHaveURL(/\/orders$/)
  })

  test('contact link is mailto', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/orders')
    const ordersRes = await page.request.get(APP_BASE + '/api/orders')
    const { data } = await ordersRes.json()
    test.skip(!data?.length, 'no orders for user')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/orders/' + data[0].id)
      await page.waitForLoadState('networkidle')
    })
    await expect(page.getByTestId('order-detail-contact')).toHaveAttribute('href', /^mailto:/)
  })
})
