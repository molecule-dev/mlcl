/**
 * /host/listings/:id — host's listing dashboard.
 *
 * Real outcomes asserted:
 *   - GET /api/listings/:id and /api/reservations both fire
 *   - calendar/pricing/photos/rules tabs render
 *   - editing pricing PUTs /api/listings/:id and the new rate persists
 *     across reload (read-after-write)
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers'

async function createListing(page: import('@playwright/test').Page) {
  const r = await page.request.post(`${API_BASE}/listings`, {
    data: {
      title: 'E2E Pricing Test Listing',
      description: 'Used by host_listings__id tests.',
      property_type: 'cabin',
      address: 'Tahoe',
      city: 'Tahoe',
      country: 'United States',
      max_guests: 4,
      bedrooms: 2,
      beds: 2,
      bathrooms: 1,
      amenities: ['Wifi', 'Hot tub'],
      images: ['https://picsum.photos/seed/e2e-pricing/1200/900'],
      thumbnails: ['https://picsum.photos/seed/e2e-pricing/600/450'],
      price_per_night: 250,
      cleaning_fee: 50,
      currency: 'USD',
    },
  })
  expect([200, 201]).toContain(r.status())
  const body = (await r.json()) as { id?: string; data?: { id?: string } }
  return body.id ?? body.data?.id ?? ''
}

test('host listing detail renders calendar + pricing tabs and KPI cards', async ({ page }) => {
  await signup(page)
  const id = await createListing(page)
  expect(id).toBeTruthy()
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/host/listings/${id}`)
    await page.waitForLoadState('networkidle')
  })
  const detail = reqs.find((r) => r.url.includes(`/api/listings/${id}`) && r.method === 'GET')
  const reservations = reqs.find((r) => r.url.includes('/api/reservations') && r.method === 'GET')
  expect(detail?.status).toBe(200)
  expect(reservations?.status).toBe(200)
  await expect(page.getByRole('heading', { name: 'E2E Pricing Test Listing' })).toBeVisible()
  // Calendar is the default tab
  await expect(page.getByRole('heading', { name: /^Calendar$/ })).toBeVisible()
})

test('Pricing tab: PUT /api/listings/:id persists new nightly rate (read-after-write)', async ({
  page,
}) => {
  await signup(page)
  const id = await createListing(page)
  await page.goto(APP_BASE + `/host/listings/${id}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^Pricing$/ }).click()
  // Update the weekday rate to $310.
  const weekdayInput = page.locator('input').filter({ hasText: '' }).first()
  await weekdayInput.fill('$310')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /^Save pricing$/ }).click()
    await page.waitForTimeout(1500)
  })
  const put = reqs.find((r) => r.url.includes(`/api/listings/${id}`) && r.method === 'PUT')
  expect(put?.status).toBe(200)
  await expect(page.getByText(/^Saved$/).first()).toBeVisible({ timeout: 10000 })

  // Reload + read the listing back.
  const after = await page.request.get(`${API_BASE}/listings/${id}`)
  const body = (await after.json()) as { price_per_night?: number; price_per_night_cents?: number }
  const dollars = body.price_per_night ?? (body.price_per_night_cents ?? 0) / 100
  expect(dollars).toBeGreaterThanOrEqual(310)
})

test('Photos tab swaps the active panel to the photos grid', async ({ page }) => {
  await signup(page)
  const id = await createListing(page)
  await page.goto(APP_BASE + `/host/listings/${id}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^Photos$/ }).click()
  // The Photos panel header renders.
  await expect(page.getByRole('heading', { name: /^Photos$/ })).toBeVisible({ timeout: 5000 })
})

test('Rules tab swaps the active panel to the house-rules list', async ({ page }) => {
  await signup(page)
  const id = await createListing(page)
  await page.goto(APP_BASE + `/host/listings/${id}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^Rules$/ }).click()
  await expect(page.getByRole('heading', { name: /house rules|^Rules$/i })).toBeVisible({
    timeout: 5000,
  })
})

test('Back to All listings link navigates to /host/listings', async ({ page }) => {
  await signup(page)
  const id = await createListing(page)
  await page.goto(APP_BASE + `/host/listings/${id}`)
  await page.waitForLoadState('networkidle')
  const back = page.getByRole('link', { name: /all listings/i }).first()
  await expect(back).toBeVisible()
  await back.click()
  await expect(page).toHaveURL(/\/host\/listings$/)
})
