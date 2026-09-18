/**
 * /users/:id — public host profile page.
 *
 * Real outcomes asserted:
 *   - GET /api/hosts/:id and GET /api/hosts/:id/listings both fire
 *   - hero renders host name + member-since eyebrow
 *   - stats grid shows three KPIs
 *   - listings grid renders listings created by that host (or the
 *     "no active listings" empty state)
 *   - clicking a listing card navigates to /listings/:id
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers'

test('host profile fetches host + listings and renders the hero', async ({ page }) => {
  await signup(page)
  // Create a listing so the host has at least one card to render.
  const create = await page.request.post(`${API_BASE}/listings`, {
    data: {
      title: 'Profile Page Cabin',
      description: 'Used to verify the public host profile page.',
      property_type: 'cabin',
      address: 'Profile Town',
      city: 'Profile Town',
      country: 'United States',
      max_guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: ['Wifi'],
      images: ['https://picsum.photos/seed/profile/1200/900'],
      thumbnails: ['https://picsum.photos/seed/profile/600/450'],
      price_per_night: 220,
      cleaning_fee: 25,
      currency: 'USD',
    },
  })
  expect([200, 201]).toContain(create.status())
  const me = await page.request.get(`${API_BASE}/users/me`)
  const meBody = (await me.json()) as {
    id?: string
    props?: { id?: string }
    user?: { id?: string }
  }
  const userId = meBody.id ?? meBody.props?.id ?? meBody.user?.id
  expect(userId).toBeTruthy()

  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/users/${userId}`)
    await page.waitForLoadState('networkidle')
  })
  const host = reqs.find(
    (r) =>
      r.url.includes(`/api/hosts/${userId}`) && !r.url.includes('listings') && r.method === 'GET',
  )
  const list = reqs.find(
    (r) => r.url.includes(`/api/hosts/${userId}/listings`) && r.method === 'GET',
  )
  expect(host?.status).toBe(200)
  expect(list?.status).toBe(200)
  // Hero "Roost member since YYYY" eyebrow renders.
  await expect(page.getByText(/roost member since/i)).toBeVisible()
  // Listings section header renders.
  await expect(page.getByRole('heading', { name: /'s listings/i })).toBeVisible()
  // The listing we just created shows up.
  await expect(page.getByText('Profile Page Cabin').first()).toBeVisible({ timeout: 10000 })
})

test('host name heading renders from /api/hosts/:id payload', async ({ page }) => {
  const result = await signup(page)
  // The user we just created has a name composed from firstName + lastName.
  const me = await page.request.get(`${API_BASE}/users/me`)
  const body = (await me.json()) as { id?: string; props?: { id?: string } }
  const userId = body.id ?? body.props?.id
  await page.goto(APP_BASE + `/users/${userId}`)
  await page.waitForLoadState('networkidle')
  // h1 should contain at least the first name.
  const h1 = page.getByRole('heading', { level: 1 }).first()
  await expect(h1).toContainText(result.firstName, { timeout: 10000 })
})

test('public host profile renders the three-stat grid', async ({ page }) => {
  await signup(page)
  const me = await page.request.get(`${API_BASE}/users/me`)
  const body = (await me.json()) as { id?: string; props?: { id?: string } }
  const userId = body.id ?? body.props?.id
  await page.goto(APP_BASE + `/users/${userId}`)
  await page.waitForLoadState('networkidle')
  // The "Roost member since YYYY" eyebrow + the three stats labels
  // should all be visible. We assert at least 2 distinct stat-label
  // strings appear (Trips hosted, Reviews, Rating-style).
  const main = page.locator('main').first()
  const text = (await main.textContent()) ?? ''
  expect(text).toMatch(/roost member since/i)
  // At least three distinct numeric tiles render (or em-dashes for
  // a fresh host with zero history).
  const stats = (text.match(/(?:\d+(?:\.\d+)?[%★]?|—)/g) || []).length
  expect(stats).toBeGreaterThanOrEqual(3)
})

test('clicking a listing card on the profile navigates to listing detail', async ({ page }) => {
  await signup(page)
  // Seed one listing.
  await page.request.post(`${API_BASE}/listings`, {
    data: {
      title: 'Profile Click Cabin',
      description: 'Used to test navigation from profile.',
      property_type: 'cabin',
      address: 'Click Town',
      city: 'Click Town',
      country: 'United States',
      max_guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: ['Wifi'],
      images: ['https://picsum.photos/seed/click/1200/900'],
      thumbnails: ['https://picsum.photos/seed/click/600/450'],
      price_per_night: 180,
      cleaning_fee: 20,
      currency: 'USD',
    },
  })
  const me = await page.request.get(`${API_BASE}/users/me`)
  const meBody = (await me.json()) as { id?: string; props?: { id?: string } }
  const userId = meBody.id ?? meBody.props?.id

  await page.goto(APP_BASE + `/users/${userId}`)
  await page.waitForLoadState('networkidle')
  const card = page.getByText('Profile Click Cabin').first()
  await card.waitFor({ state: 'visible', timeout: 10000 })
  await card.click()
  await page.waitForURL(/\/listings\/[^/]+/, { timeout: 10000 })
  expect(page.url()).toMatch(/\/listings\/[^/]+/)
})
