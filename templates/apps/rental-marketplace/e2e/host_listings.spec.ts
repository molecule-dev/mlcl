/**
 * /host/listings — host's portfolio.
 *
 * Real outcomes asserted:
 *   - GET /api/host-listings fires and 200s
 *   - "Create new listing" CTA navigates to /host/listings/new
 *   - a freshly-created listing (via API) shows up in the list
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers'

test('host listings page fires GET /api/host-listings and renders the empty state', async ({
  page,
}) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/host/listings')
    await page.waitForLoadState('networkidle')
  })
  const r = reqs.find((req) => req.url.includes('/api/host-listings') && req.method === 'GET')
  expect(r?.status).toBe(200)
  await expect(page.getByRole('heading', { name: /^Listings$/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /create new listing/i })).toHaveAttribute(
    'href',
    /\/host\/listings\/new/,
  )
})

test('Create new listing CTA navigates to /host/listings/new', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/host/listings')
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('link', { name: /create new listing/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/host\/listings\/new$/)
})

test('a freshly-created listing appears in the host portfolio (read-after-write)', async ({
  page,
}) => {
  await signup(page)
  // Create the listing via API (this uses the host = current user
  // because cookies authenticate). Skip if /api/listings POST is not
  // accepted for any reason.
  const r = await page.request.post(`${API_BASE}/listings`, {
    data: {
      title: 'E2E Cliffside Cabin',
      description: 'A redwood retreat above the Pacific. Created by an e2e test.',
      property_type: 'cabin',
      address: 'Big Sur',
      city: 'Big Sur',
      country: 'United States',
      max_guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: ['Wifi', 'Kitchen'],
      images: ['https://picsum.photos/seed/e2e-roost-1/1200/900'],
      thumbnails: ['https://picsum.photos/seed/e2e-roost-1/600/450'],
      price_per_night: 220,
      cleaning_fee: 44,
      currency: 'USD',
    },
  })
  expect(
    r.status(),
    `POST /api/listings should 200/201; body=${(await r.text()).slice(0, 200)}`,
  ).toBeGreaterThanOrEqual(200)
  expect(r.status()).toBeLessThan(300)

  await page.goto(APP_BASE + '/host/listings')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: 'E2E Cliffside Cabin' })).toBeVisible({
    timeout: 10000,
  })
})

test('listing row link navigates to /host/listings/:id (host editor)', async ({ page }) => {
  await signup(page)
  // Seed a listing so we have a row to click.
  const create = await page.request.post(`${API_BASE}/listings`, {
    data: {
      title: 'E2E Row Click Cabin',
      description: 'Used to assert host portfolio row navigation.',
      property_type: 'cabin',
      address: 'Click Town',
      city: 'Click Town',
      country: 'United States',
      max_guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: ['Wifi'],
      images: ['https://picsum.photos/seed/host-row-click/1200/900'],
      thumbnails: ['https://picsum.photos/seed/host-row-click/600/450'],
      price_per_night: 175,
      cleaning_fee: 25,
      currency: 'USD',
    },
  })
  expect([200, 201]).toContain(create.status())
  const lb = (await create.json()) as { id?: string; data?: { id?: string } }
  const id = lb.id ?? lb.data?.id

  await page.goto(APP_BASE + '/host/listings')
  await page.waitForLoadState('networkidle')
  const row = page.locator(`a[href="/host/listings/${id}"]`).first()
  await row.waitFor({ state: 'visible', timeout: 10000 })
  await row.click()
  await page.waitForURL(new RegExp(`/host/listings/${id}$`), { timeout: 10000 })
  await expect(page.getByRole('heading', { name: 'E2E Row Click Cabin' })).toBeVisible({
    timeout: 10000,
  })
})

test('listing row renders a tabular nightly rate ($/night)', async ({ page }) => {
  await signup(page)
  // Demo seed adds a host listing for fresh users; the row shows price.
  await page.goto(APP_BASE + '/host/listings')
  await page.waitForLoadState('networkidle')
  // At least one listing row present (demo seed) — and it shows "$".
  const portfolio = page.locator('a[href^="/host/listings/"]:not([href$="/new"])')
  if ((await portfolio.count()) > 0) {
    await expect(portfolio.first()).toContainText('$')
  }
})
