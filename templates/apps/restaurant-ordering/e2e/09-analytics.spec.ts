/**
 * Analytics — verify the snapshot endpoint returns the documented shape
 * with sane zero-state values, then create a paid order and verify the
 * snapshot reflects the revenue.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, createMenuItem, signup } from './_helpers.js'

interface Snap {
  todayRevenueCents: number
  coversCount: number
  avgCheckCents: number
  tipsAvgPct: number
  busiestHour: { hour: number; cents: number } | null
  hourly: { hour: number; cents: number }[]
  topItems: { id: string | null; name: string; sold: number; grossCents: number }[]
  orderCount: number
}

test('Analytics snapshot returns documented shape with zero-state defaults', async ({ page }) => {
  await signup(page)
  const snap = await apiRequest<Snap>(page, 'GET', '/api/analytics/snapshot')
  expect(snap.status).toBe(200)
  expect(snap.body.hourly.length).toBe(24)
  expect(snap.body.todayRevenueCents).toBe(0)
  expect(snap.body.coversCount).toBe(0)
  expect(snap.body.topItems).toEqual([])
})

test('A paid order increases today revenue', async ({ page }) => {
  await signup(page)
  const item = await createMenuItem(page, { name: 'Croissant', price: 4.5 })
  const order = await apiRequest<{ id: string }>(page, 'POST', '/api/orders', {
    items: [{ menu_item_id: item.id, quantity: 4 }],
  })
  expect(order.status).toBe(201)
  await apiRequest(page, 'POST', `/api/orders/${order.body.id}/pay`, { method: 'cash' })

  const snap = await apiRequest<Snap>(page, 'GET', '/api/analytics/snapshot')
  expect(snap.status).toBe(200)
  expect(snap.body.todayRevenueCents).toBeGreaterThanOrEqual(1800) // 4 × 450
  expect(snap.body.coversCount).toBeGreaterThanOrEqual(1)
  expect(snap.body.topItems.find((t) => t.name === 'Croissant')?.sold).toBeGreaterThanOrEqual(4)
})

test('Analytics page renders KPIs', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/analytics', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/Revenue|Today, by the numbers/i).first()).toBeVisible({
    timeout: 15000,
  })
})
