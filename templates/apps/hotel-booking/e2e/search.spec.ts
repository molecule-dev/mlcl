import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiRequest,
  captureNetwork,
  isoOffset,
  listProperties,
  signup,
} from './_helpers.js'

test.describe('/search (SearchResults)', () => {
  test('GET /api/properties returns the live catalog', async ({ request }) => {
    const res = await request.get(API_BASE + '/properties')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.data.length).toBeGreaterThan(0)
    const first = body.data[0]
    expect(first.id).toBeTruthy()
    expect(first.name).toBeTruthy()
    expect(typeof first.price_per_night_cents).toBe('number')
    expect(Array.isArray(first.gallery)).toBe(true)
    expect(Array.isArray(first.amenities)).toBe(true)
  })

  test('search query narrows the result set', async ({ request }) => {
    const all = await request.get(API_BASE + '/properties').then((r) => r.json())
    type Row = { id: string; name: string; city: string; country: string; description?: string }
    const haystack = (p: Row) =>
      `${p.name} ${p.city} ${p.country} ${p.description ?? ''}`.toLowerCase()
    // Search for a city the live catalog actually holds, and pick one that
    // leaves at least one property out — naming a demo city broke this spec
    // the moment the catalog was replaced.
    const rows: Row[] = all.data
    const pair = rows
      .map((row) => ({
        q: String(row.city ?? '').toLowerCase(),
        excluded: rows.find(
          (other) => !haystack(other).includes(String(row.city ?? '').toLowerCase()),
        ),
      }))
      .find((candidate) => candidate.q && candidate.excluded)
    expect(pair, 'the catalog needs properties in more than one city').toBeTruthy()
    const { q, excluded } = pair!

    const res = await request.get(API_BASE + '/properties?q=' + encodeURIComponent(q))
    const narrowed = await res.json()
    expect(narrowed.data.length).toBeGreaterThan(0)
    expect(narrowed.data.length).toBeLessThanOrEqual(rows.length)
    expect(narrowed.data.every((p: Row) => haystack(p).includes(q))).toBe(true)
    // …and the property that does not match is gone.
    expect(narrowed.data.some((p: Row) => p.id === excluded!.id)).toBe(false)
  })

  test('property detail returns rooms and reviews', async ({ page }) => {
    const properties = await listProperties(page)
    const target = properties[0]
    const rooms = await page.request
      .get(API_BASE + '/properties/' + target.id + '/rooms')
      .then((r) => r.json())
    expect(rooms.data.length).toBeGreaterThan(0)
    expect(rooms.data[0].property_id).toBe(target.id)
    const reviews = await page.request
      .get(API_BASE + '/properties/' + target.id + '/reviews')
      .then((r) => r.json())
    expect(Array.isArray(reviews.data)).toBe(true)
  })

  test('/search renders the heading and a card per catalog property', async ({ page }) => {
    // How many cards to expect comes from the API, not from how many rows the
    // demo seed happens to create.
    const properties = await listProperties(page)
    expect(properties.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/search', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /Curated stays/i, level: 1 })).toBeVisible()
    await expect(page.locator('a[href^="/property/"]')).toHaveCount(properties.length)
  })

  test('property detail page renders gallery + Reserve CTA with proper href', async ({ page }) => {
    const properties = await listProperties(page)
    const target = properties[0]
    await page.goto(APP_BASE + '/property/' + target.id, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: target.name })).toBeVisible()
    const reserve = page.getByTestId('reserve-cta')
    await expect(reserve).toBeVisible()
    const href = await reserve.getAttribute('href')
    expect(href).toContain('/booking/' + target.id)
  })

  test('property detail accepts dates and forwards them to /booking', async ({ page }) => {
    const properties = await listProperties(page)
    const target = properties[0]
    await page.goto(APP_BASE + '/property/' + target.id, { waitUntil: 'domcontentloaded' })
    const checkIn = isoOffset(21)
    const checkOut = isoOffset(24)
    await page.locator('input[type="date"]').nth(0).fill(checkIn)
    await page.locator('input[type="date"]').nth(1).fill(checkOut)
    const reserve = page.getByTestId('reserve-cta')
    const href = await reserve.getAttribute('href')
    expect(href).toContain('check_in=' + checkIn)
    expect(href).toContain('check_out=' + checkOut)
  })

  test('"Sort by" combobox change re-orders the cards', async ({ page }) => {
    await page.goto(APP_BASE + '/search', { waitUntil: 'domcontentloaded' })
    const cards = page.locator('a[href^="/property/"]')
    await cards.first().waitFor({ timeout: 10_000 })
    const firstBefore = await cards.first().innerText()
    await page.getByRole('combobox', { name: /Sort by/i }).selectOption({ index: 1 })
    await page.waitForTimeout(200)
    const firstAfter = await cards.first().innerText()
    expect(firstAfter).not.toEqual(firstBefore)
  })

  test('amenity filter button reduces (or maintains) the visible card count', async ({ page }) => {
    await page.goto(APP_BASE + '/search', { waitUntil: 'domcontentloaded' })
    const cards = page.locator('a[href^="/property/"]')
    await cards.first().waitFor({ timeout: 10_000 })
    const initial = await cards.count()
    await page.getByRole('button', { name: /^Pool$/ }).click()
    await page.waitForTimeout(200)
    const filtered = await cards.count()
    expect(filtered).toBeLessThanOrEqual(initial)
  })

  test('save (heart) button persists a favorite via POST /api/favorites', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signup(page)
    await page.goto(APP_BASE + '/search', { waitUntil: 'domcontentloaded' })
    await page.locator('a[href^="/property/"]').first().waitFor({ timeout: 10_000 })

    const reqs = await captureNetwork(page, async () => {
      await page.locator('button[aria-label*="Save" i]').first().click()
      await page.waitForTimeout(800)
    })
    expect(
      reqs.some(
        (r) =>
          r.url.endsWith('/api/favorites') &&
          r.method === 'POST' &&
          (r.status === 201 || r.status === 200),
      ),
      'a POST /api/favorites must be observed (201 or 200)',
    ).toBeTruthy()

    const list = await apiRequest<{ data: Array<{ property_id: string }> }>(
      page,
      'GET',
      '/api/favorites',
    )
    expect(list.status).toBe(200)
    expect(list.body.data.length).toBeGreaterThan(0)
    await ctx.close()
  })

  test('clicking a price pin in the map column navigates to that property', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(APP_BASE + '/search', { waitUntil: 'domcontentloaded' })
    await page.locator('a[href^="/property/"]').first().waitFor({ timeout: 10_000 })
    const pin = page.locator('button[aria-label*="per night" i]').first()
    await pin.waitFor({ state: 'visible', timeout: 10_000 })
    // Pins use window.location.href in onClick. Fire the click via the DOM
    // directly so the React handler runs without any pointer-event quirks
    // around the sticky-map's gradient/grid overlay.
    await pin.evaluate((el: HTMLButtonElement) => el.click())
    await page.waitForURL(/\/property\//, { timeout: 15_000 })
    expect(page.url()).toContain('/property/')
  })

  // The hotels handler at /api/hotels powers the catalog (properties is a
  // view-shaped alias). Asserting on it directly proves the underlying
  // resource is mounted and reachable.
  test('GET /api/hotels returns the underlying catalog rows', async ({ request }) => {
    const res = await request.get(API_BASE + '/hotels')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
    const first = body.data[0]
    expect(first.id).toBeTruthy()
    expect(first.name).toBeTruthy()
    expect(typeof first.stars === 'number' || first.stars === null).toBe(true)
  })

  test('GET /api/hotels/:id/rooms returns rooms for a hotel', async ({ request }) => {
    const list = await request.get(API_BASE + '/hotels').then((r) => r.json())
    const hotelId = list.data[0].id
    const res = await request.get(API_BASE + '/hotels/' + hotelId + '/rooms')
    expect(res.ok()).toBe(true)
    const rooms = await res.json()
    expect(Array.isArray(rooms)).toBe(true)
    expect(rooms.length).toBeGreaterThan(0)
  })
})
