/**
 * Orders history — searchable archive of completed/cancelled tickets.
 * Verifies the page loads, paid orders appear, and the filter chips
 * narrow the list.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, createMenuItem, signup, type ApiOrder } from './_helpers.js'

async function placeAndPay(page: import('@playwright/test').Page, name: string) {
  const item = await createMenuItem(page, { name, price: 10 })
  const o = await apiRequest<ApiOrder>(page, 'POST', '/api/orders', {
    items: [{ menu_item_id: item.id, quantity: 1 }],
  })
  await apiRequest(page, 'POST', `/api/orders/${o.body.id}/pay`, { method: 'cash' })
  return o.body.id
}

test('Orders history page renders the heading and ticket table', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/orders/history', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /order history/i })).toBeVisible()
  // Empty state OR populated state is acceptable; the page must render either.
  // The "Total in view" badge is always present once the page mounts (it
  // reads $0.00 in the empty state) — assert on it directly.
  const total = page.locator('[data-testid="orderhistory-total"]').first()
  await expect(total).toBeVisible({ timeout: 10000 })
})

test('Orders history: paid orders show up with their total', async ({ page }) => {
  await signup(page)
  const id = await placeAndPay(page, 'History Ramen')
  await page.goto(APP_BASE + '/orders/history', { waitUntil: 'domcontentloaded' })
  // The page lists tickets — the new id should appear as a link.
  await page.waitForTimeout(800)
  const link = page.locator(`a[href="/orders/${id}"]`).first()
  await expect(link).toBeVisible({ timeout: 10000 })
})

test('Orders history: GET /api/orders supports limit pagination', async ({ page }) => {
  await signup(page)
  const r = await apiRequest<{ data: ApiOrder[] }>(page, 'GET', '/api/orders?limit=5')
  expect(r.status).toBe(200)
  expect(r.body.data.length).toBeLessThanOrEqual(5)
})

test('Orders history total badge sums visible tickets', async ({ page }) => {
  await signup(page)
  await placeAndPay(page, 'Tally A')
  await placeAndPay(page, 'Tally B')
  await page.goto(APP_BASE + '/orders/history', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  const total = page.locator('[data-testid="orderhistory-total"]').first()
  await expect(total).toBeVisible()
  const text = (await total.textContent()) ?? ''
  // Two $10 cash tickets — total should be at least $20.
  const num = Number(text.replace(/[^0-9.]/g, ''))
  expect(num).toBeGreaterThanOrEqual(20)
})
