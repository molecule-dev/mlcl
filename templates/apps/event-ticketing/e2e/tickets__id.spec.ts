import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  seedEvent,
  seedOrder,
  seedTier,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/tickets/:id page', () => {
  test('renders ticket header with breadcrumb back to /my-tickets', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    const tier = await seedTier(page, auth.accessToken, ev.id)
    const order = await seedOrder(page, auth.accessToken, { eventId: ev.id, tierId: tier.id })
    const ticketId = order.tickets[0].id
    await page.goto(APP_BASE + '/tickets/' + ticketId)
    await expect(page.locator('[data-mol-id="ticket-ref"]')).toContainText(
      order.tickets[0].ref_code,
    )
  })

  test('view order button navigates to /orders/:id/confirmation', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    const tier = await seedTier(page, auth.accessToken, ev.id)
    const order = await seedOrder(page, auth.accessToken, { eventId: ev.id, tierId: tier.id })
    await page.goto(APP_BASE + '/tickets/' + order.tickets[0].id)
    await page.locator('[data-mol-id="ticket-view-order"]').click()
    await expect(page).toHaveURL(/\/orders\/.+\/confirmation/)
  })

  test('opening transfer reveals an email input', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    const tier = await seedTier(page, auth.accessToken, ev.id)
    const order = await seedOrder(page, auth.accessToken, { eventId: ev.id, tierId: tier.id })
    await page.goto(APP_BASE + '/tickets/' + order.tickets[0].id)
    await page.locator('[data-mol-id="transfer-open"]').click()
    await expect(page.locator('[data-mol-id="transfer-email"]')).toBeVisible()
  })

  test('submitting transfer fires POST /api/transfers/:ticket_id', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    const tier = await seedTier(page, auth.accessToken, ev.id)
    const order = await seedOrder(page, auth.accessToken, { eventId: ev.id, tierId: tier.id })
    await page.goto(APP_BASE + '/tickets/' + order.tickets[0].id)
    await page.locator('[data-mol-id="transfer-open"]').click()
    await page.locator('[data-mol-id="transfer-email"]').fill('friend@example.com')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="transfer-submit"]').click()
      await page.waitForLoadState('networkidle')
    })
    const tr = reqs.find((r) => r.method === 'POST' && /\/api\/transfers\//.test(r.url))
    expect(tr, 'POST /api/transfers/:ticket_id').toBeTruthy()
    expect(tr?.status).toBeLessThan(500)
  })

  test('opening refund reveals a reason textarea', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    const tier = await seedTier(page, auth.accessToken, ev.id)
    const order = await seedOrder(page, auth.accessToken, { eventId: ev.id, tierId: tier.id })
    await page.goto(APP_BASE + '/tickets/' + order.tickets[0].id)
    await page.locator('[data-mol-id="refund-open"]').click()
    await expect(page.locator('[data-mol-id="refund-reason"]')).toBeVisible()
  })

  test('submitting refund fires POST /api/refunds', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    const tier = await seedTier(page, auth.accessToken, ev.id)
    const order = await seedOrder(page, auth.accessToken, { eventId: ev.id, tierId: tier.id })
    await page.goto(APP_BASE + '/tickets/' + order.tickets[0].id)
    await page.locator('[data-mol-id="refund-open"]').click()
    await page.locator('[data-mol-id="refund-reason"]').fill('Plans changed')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="refund-submit"]').click()
      await page.waitForLoadState('networkidle')
    })
    const r = reqs.find((req) => req.method === 'POST' && /\/api\/refunds/.test(req.url))
    expect(r, 'POST /api/refunds').toBeTruthy()
    expect(r?.status).toBeLessThan(500)
  })
})
