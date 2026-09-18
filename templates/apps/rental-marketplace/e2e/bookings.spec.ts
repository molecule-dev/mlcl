/**
 * /bookings — guest's trip itinerary list.
 *
 * Real outcomes asserted:
 *   - tabs (Upcoming / Past) actually filter
 *   - a freshly-created booking appears under the Upcoming tab
 *     (which means the frontend status filter must align with the
 *     API's `pending` | `confirmed` decoration — see BUG fix
 *     8cbe56a2)
 *   - cancellation flips the row over to the Past tab
 *
 * The SPA authenticates via HttpOnly token+sessionId cookies set by
 * POST /api/users (signup). All seed/teardown calls go through
 * `page.request` so cookies persist across the API + UI surface.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers'

async function getFirstListing(
  page: import('@playwright/test').Page,
): Promise<{ id: string; title: string }> {
  const res = await page.request.get(`${API_BASE}/listings`)
  expect(res.ok(), `GET ${API_BASE}/listings failed`).toBeTruthy()
  const body = (await res.json()) as { data: Array<{ id: string; title: string }> }
  expect(body.data.length, 'seed listings should exist').toBeGreaterThan(0)
  return body.data[0]
}

test('upcoming tab shows the booking we just made (status mapping fix)', async ({ page }) => {
  await signup(page)
  const listing = await getFirstListing(page)

  const checkIn = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const checkOut = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10)
  const create = await page.request.post(`${API_BASE}/bookings`, {
    data: { listing_id: listing.id, check_in: checkIn, check_out: checkOut, guests: 2 },
  })
  expect(create.status(), 'POST /bookings should succeed').toBe(201)
  const booking = (await create.json()) as { id: string; status: string }
  // The decorator must classify a future-dated pending booking as
  // pending — never as the legacy 'upcoming' string.
  expect(['pending', 'confirmed']).toContain(booking.status)

  await page.goto(APP_BASE + '/bookings')
  await page.waitForLoadState('networkidle')

  const upcomingTab = page.getByRole('tab', { name: /upcoming/i })
  const pastTab = page.getByRole('tab', { name: /past/i })
  await expect(upcomingTab).toHaveAttribute('aria-selected', 'true')

  // The new booking's listing title should be visible under the
  // Upcoming tab — this is the assertion that would have failed
  // before the status-mapping fix.
  await expect(page.getByText(listing.title, { exact: false }).first()).toBeVisible({
    timeout: 10000,
  })

  // Switch to Past — the new booking should NOT be listed.
  await pastTab.click()
  await expect(pastTab).toHaveAttribute('aria-selected', 'true')
  // No populated row should match the listing title (empty state OK).
  const pastRows = page.locator('a[href^="/bookings/"]').filter({ hasText: listing.title })
  await expect(pastRows).toHaveCount(0)
})

test('cancelling a booking moves it from Upcoming to Past', async ({ page }) => {
  await signup(page)
  const listing = await getFirstListing(page)
  const checkIn = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  const checkOut = new Date(Date.now() + 16 * 86400000).toISOString().slice(0, 10)
  const create = await page.request.post(`${API_BASE}/bookings`, {
    data: { listing_id: listing.id, check_in: checkIn, check_out: checkOut, guests: 2 },
  })
  const booking = (await create.json()) as { id: string }

  // Cancel via API — exercise read-after-write: the row should now be
  // in the Past tab, with status=cancelled persisted.
  const cancel = await page.request.put(`${API_BASE}/bookings/${booking.id}/cancel`, {
    data: { reason: 'plans_changed' },
  })
  expect(cancel.status()).toBe(200)
  const cancelled = (await cancel.json()) as { status: string }
  expect(cancelled.status).toBe('cancelled')

  await page.goto(APP_BASE + '/bookings')
  await page.waitForLoadState('networkidle')

  // Past tab should show the cancelled row.
  await page.getByRole('tab', { name: /past/i }).click()
  await expect(page.getByText(listing.title, { exact: false }).first()).toBeVisible({
    timeout: 10000,
  })

  // Upcoming tab should be empty (or at least not contain that row).
  await page.getByRole('tab', { name: /upcoming/i }).click()
  const upcomingRows = page.locator('a[href^="/bookings/"]').filter({ hasText: listing.title })
  await expect(upcomingRows).toHaveCount(0)
})

test('plan another trip CTA links to /search', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/bookings')
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('link', { name: /plan another trip/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/search$/)
})

test('empty-state: a brand-new account with no bookings shows the empty card', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/bookings')
  await page.waitForLoadState('networkidle')
  // No itinerary rows.
  const rows = page.locator('a[href^="/bookings/"]')
  await expect(rows).toHaveCount(0)
  // Empty CTA visible.
  await expect(page.getByRole('link', { name: /browse stays/i }).first()).toBeVisible()
})

test('mounting /bookings calls GET /api/bookings (captureNetwork)', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/bookings')
    await page.waitForLoadState('networkidle')
  })
  const get = reqs.find((r) => /\/api\/bookings(\?|$)/.test(r.url) && r.method === 'GET')
  expect(get, 'GET /api/bookings should fire on mount').toBeTruthy()
  expect(get!.status).toBe(200)
})

test('clicking a booking row navigates to /bookings/:id', async ({ page }) => {
  await signup(page)
  const listings = await page.request.get(`${API_BASE}/listings`)
  const lb = (await listings.json()) as { data: Array<{ id: string }> }
  const checkIn = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10)
  const checkOut = new Date(Date.now() + 42 * 86400000).toISOString().slice(0, 10)
  const create = await page.request.post(`${API_BASE}/bookings`, {
    data: { listing_id: lb.data[0].id, check_in: checkIn, check_out: checkOut, guests: 2 },
  })
  expect(create.status()).toBe(201)
  const booking = (await create.json()) as { id: string }

  await page.goto(APP_BASE + '/bookings')
  await page.waitForLoadState('networkidle')
  const row = page.locator(`a[href="/bookings/${booking.id}"]`).first()
  await row.waitFor({ state: 'visible', timeout: 10000 })
  await row.click()
  await page.waitForURL(new RegExp(`/bookings/${booking.id}$`), { timeout: 10000 })
  expect(page.url()).toContain(`/bookings/${booking.id}`)
})
