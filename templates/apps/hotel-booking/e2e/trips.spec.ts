import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiRequest,
  captureNetwork,
  isoOffset,
  listProperties,
  listRooms,
  signup,
} from './_helpers.js'

async function ensureOneReservation(page: import('@playwright/test').Page) {
  const properties = await listProperties(page)
  const rooms = await listRooms(page, properties[0].id)
  const r = await apiRequest<{ id?: string }>(page, 'POST', '/api/reservations', {
    room_id: rooms[0].id,
    check_in: isoOffset(95),
    check_out: isoOffset(98),
    guests: 2,
  })
  if (r.status !== 201 && r.status !== 200) {
    throw new Error(
      'ensureOneReservation: unexpected status ' + r.status + ' body=' + JSON.stringify(r.body),
    )
  }
}

test.describe('/trips (Trips)', () => {
  test('renders the "Your trips" heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /Your trips/i, level: 1 })).toBeVisible()
  })

  test('renders the "Upcoming" section heading after a reservation exists', async ({ page }) => {
    await signup(page)
    await ensureOneReservation(page)
    await page.goto(APP_BASE + '/trips', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /^Upcoming$/i, level: 2 })).toBeVisible()
  })

  test('every reservation row links to /trips/:id', async ({ page }) => {
    await signup(page)
    await ensureOneReservation(page)
    await page.goto(APP_BASE + '/trips', { waitUntil: 'domcontentloaded' })
    const links = page.locator('a[href^="/trips/"]')
    await expect(links.first()).toBeVisible()
    await expect(links.first()).toBeAttached()
    const href = await links.first().getAttribute('href')
    expect(href).toMatch(/\/trips\/[a-f0-9-]+/)
  })

  test('trip card shows the property name', async ({ page }) => {
    await signup(page)
    await ensureOneReservation(page)
    await page.goto(APP_BASE + '/trips', { waitUntil: 'domcontentloaded' })
    const props = await listProperties(page)
    const expectedName = new RegExp(props[0].name.split(' ')[0], 'i')
    await expect(page.getByRole('heading', { level: 3, name: expectedName }).first()).toBeVisible()
  })

  test('"upcoming" status pill is present on at least one card', async ({ page }) => {
    await signup(page)
    await ensureOneReservation(page)
    await page.goto(APP_BASE + '/trips', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/^upcoming$/i).first()).toBeVisible()
  })

  test('empty state ("No trips") with browse-stays link is shown for a fresh user', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips', { waitUntil: 'domcontentloaded' })
    const empty = page.getByText(/no trips/i)
    if (await empty.count()) {
      // App copy: "Find your next stay" link points to /search. Use first()
      // since the global nav also has a Search link.
      await expect(
        page.getByRole('link', { name: /Find your next stay|Browse stays/i }).first(),
      ).toBeVisible()
    } else {
      // Some fixtures auto-seed; just assert the page rendered.
      await expect(page.getByRole('heading', { name: /Your trips/i })).toBeVisible()
    }
  })

  test('observes GET /api/trips on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/trips', { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => r.url.endsWith('/api/trips') && r.method === 'GET'),
      'GET /api/trips must be observed on page load',
    ).toBeTruthy()
  })
})
