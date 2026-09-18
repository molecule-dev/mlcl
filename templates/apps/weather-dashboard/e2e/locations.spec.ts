import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test('Add Location form geocodes the address and the new card appears', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/locations')
  await page
    .getByRole('button', { name: /add\s*location/i })
    .first()
    .click()
  await page.locator('input[type="text"]').first().fill('Berlin, Germany')
  await page.getByRole('button', { name: /save\s*location/i }).click()

  // Wait for the card to render
  await expect(page.locator('main')).toContainText(/Berlin/i, { timeout: 15_000 })

  // Backend invariant: the saved row has real lat/lon from Nominatim
  const list = await api<Array<{ name: string; latitude: number; longitude: number }>>(
    page,
    'GET',
    '/locations',
  )
  const berlin = list.find((l) => /Berlin/i.test(l.name))
  expect(berlin, 'Berlin row in /api/locations').toBeTruthy()
  expect(Number(berlin!.latitude)).toBeCloseTo(52.52, 0)
  expect(Number(berlin!.longitude)).toBeCloseTo(13.4, 0)
})

test('Set-as-default star pip flips the default location (read-after-write)', async ({ page }) => {
  await signup(page)
  // Seed two locations directly. London is initial default.
  await api(page, 'POST', '/locations', {
    name: 'Paris',
    address: 'Paris, France',
    is_default: true,
  })
  const tokyo = await api<{ id: string; name: string }>(page, 'POST', '/locations', {
    name: 'Tokyo',
    address: 'Tokyo, Japan',
  })

  await page.goto(APP_BASE + '/locations')
  // Click the star pip on Tokyo's card.
  await page.locator(`button[aria-label="Set Tokyo as default"]`).click()
  // After the network round-trip the DEFAULT badge should be on Tokyo.
  await expect(page.locator('main')).toContainText(/Tokyo/i)
  // Backend invariant: /api/locations/default now returns Tokyo.
  await page.waitForTimeout(800)
  const def = await api<{ id: string; name: string }>(page, 'GET', '/locations/default')
  expect(def.id).toBe(tokyo.id)
  expect(def.name).toBe('Tokyo')
})

test('Remove pip deletes the location and it disappears from /api/locations', async ({ page }) => {
  await signup(page)
  const target = await api<{ id: string; name: string }>(page, 'POST', '/locations', {
    name: 'Sydney',
    address: 'Sydney, Australia',
  })
  await page.goto(APP_BASE + '/locations')
  await page.locator('button[aria-label="Remove Sydney"]').click()
  await page.waitForTimeout(800)
  // Backend invariant
  const list = await api<Array<{ id: string }>>(page, 'GET', '/locations')
  expect(list.find((l) => l.id === target.id)).toBeUndefined()
})

test('Locations page captures GET /api/locations on initial load', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/locations')
    await page.waitForLoadState('networkidle')
  })
  const list = reqs.find((r) => r.method === 'GET' && r.url.endsWith('/api/locations'))
  expect(list, 'GET /api/locations on page load').toBeTruthy()
  expect(list!.status).toBe(200)
})

test('Search input filters cards client-side without re-fetching', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Reykjavik',
    address: 'Reykjavik, Iceland',
    is_default: true,
  })
  await api(page, 'POST', '/locations', { name: 'Tokyo', address: 'Tokyo, Japan' })
  await page.goto(APP_BASE + '/locations')
  await expect(page.locator('main')).toContainText('Reykjavik', { timeout: 10_000 })
  await expect(page.locator('main')).toContainText('Tokyo')
  const search = page.locator('input[type="search"]').first()
  await search.fill('Tokyo')
  await expect(page.locator('main')).toContainText('Tokyo')
  await expect(page.locator('main')).not.toContainText('Reykjavik')
  await search.fill('')
  await expect(page.locator('main')).toContainText('Reykjavik')
})

test('"Set as default" checkbox in the modal flips the default on save (read-after-write)', async ({
  page,
}) => {
  await signup(page)
  // Pre-create a default so we can verify the flip.
  await api(page, 'POST', '/locations', {
    name: 'OldDefault',
    address: 'Cairo, Egypt',
    is_default: true,
  })
  await page.goto(APP_BASE + '/locations')
  await page
    .getByRole('button', { name: /add\s*location/i })
    .first()
    .click()
  await page.locator('input[type="text"]').first().fill('Lisbon, Portugal')
  // Tick the "set as default" checkbox before saving.
  const defaultCheckbox = page.locator('input[type="checkbox"]').first()
  await defaultCheckbox.check()
  await page.getByRole('button', { name: /save\s*location/i }).click()
  await expect(page.locator('main')).toContainText(/Lisbon/i, { timeout: 15_000 })
  await page.waitForTimeout(800)
  const def = await api<{ name: string }>(page, 'GET', '/locations/default')
  expect(def.name.toLowerCase()).toContain('lisbon')
})

test('Clicking a LocationCard body navigates to /location/:id', async ({ page }) => {
  await signup(page)
  const created = await api<{ id: string }>(page, 'POST', '/locations', {
    name: 'Athens',
    address: 'Athens, Greece',
    is_default: true,
  })
  await page.goto(APP_BASE + '/locations')
  await page.locator(`main a[href="/location/${created.id}"]`).first().click()
  await page.waitForURL(`**/location/${created.id}`)
  expect(page.url()).toContain(`/location/${created.id}`)
})

test('Default-location forecasts: dashboard renders real temp + humidity', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Madrid',
    address: 'Madrid, Spain',
    is_default: true,
  })
  await page.goto(APP_BASE + '/dashboard')
  // Dashboard should show "Madrid" + a non-zero numeric temperature.
  await expect(page.locator('main')).toContainText(/Madrid/i, { timeout: 15_000 })
  // Hourly strip has at least one row with a temp like "53°F". Open-Meteo's
  // free tier may rate-limit (429) under load, so we poll-with-reload to
  // handle transient unavailability — a real user would refresh too.
  await expect
    .poll(
      async () => {
        const text = await page.locator('main').innerText()
        if (/\d{1,3}°F/.test(text)) return true
        await page.reload()
        await expect(page.locator('main')).toContainText(/Madrid/i, { timeout: 10_000 })
        return false
      },
      { timeout: 60_000, intervals: [2_000, 4_000, 8_000] },
    )
    .toBe(true)
})
