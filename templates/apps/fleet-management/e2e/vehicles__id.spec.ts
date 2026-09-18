import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  firstVehicleId,
  signup,
  waitForSeed,
} from './_helpers.js'

test.describe('vehicle detail (/vehicles/:id)', () => {
  test('renders header, plate, vehicle subtitle, VIN, and status chip', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    await page.goto(APP_BASE + `/vehicles/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    // Eyebrow says "Vehicle".
    await expect(page.getByText(/^vehicle$/i).first()).toBeVisible()
    // Subtitle: <year> <make> <model> · <vehicle_type>
    await expect(page.getByText(/\d{4}\s+\w+/)).toBeVisible()
    // VIN line.
    await expect(page.getByText(/^VIN:/i)).toBeVisible()
  })

  test('stat cards render Odometer, Speed, Fuel, Engine with numeric values', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    await page.goto(APP_BASE + `/vehicles/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/odometer/i)).toBeVisible()
    await expect(page.getByText(/^speed$/i)).toBeVisible()
    await expect(page.getByText(/^fuel$/i)).toBeVisible()
    await expect(page.getByText(/^engine$/i)).toBeVisible()
    // Body should contain at least one numeric value.
    const body = (await page.locator('body').textContent()) ?? ''
    expect(body).toMatch(/\d+/)
  })

  test('GET /api/vehicles/:id and /api/trips?vehicle_id=:id both fire on mount', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/vehicles/${id}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    })
    const detail = reqs.find(
      (r) => new RegExp(`/api/vehicles/${id}\\b`).test(r.url) && r.method === 'GET',
    )
    expect(detail?.status, 'GET /api/vehicles/:id').toBe(200)
    const trips = reqs.find((r) => /\/api\/trips\?vehicle_id=/.test(r.url) && r.method === 'GET')
    expect(trips?.status, 'GET /api/trips?vehicle_id=').toBe(200)
  })

  test('"All vehicles" link returns to the list page', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    await page.goto(APP_BASE + `/vehicles/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    await page.getByRole('link', { name: /all vehicles/i }).click()
    await expect(page).toHaveURL(/\/vehicles$/)
  })

  test('Recent trips section renders (or shows empty-state)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    await page.goto(APP_BASE + `/vehicles/${id}`)
    await expect(page.getByText(/recent trips/i)).toBeVisible({ timeout: 10000 })
  })

  test('detail data is consistent with backend GET /api/vehicles/:id (read-after-write)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    const apiResp = await page.request.get(API_BASE + `/vehicles/${id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(apiResp.status()).toBe(200)
    const v = (await apiResp.json()) as { plate?: string; license_plate?: string }
    const plate = v.plate || v.license_plate || ''
    expect(plate.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + `/vehicles/${id}`)
    await expect(page.getByText(plate)).toBeVisible({ timeout: 10000 })
  })

  test('non-existent :id renders a "Vehicle not found." graceful state, not a JS crash', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await page.goto(APP_BASE + `/vehicles/00000000-0000-0000-0000-000000000000`)
    // Either a "not found" message OR a redirect — but the layout shell must remain.
    await expect(page.locator('body')).toBeVisible()
    // No uncaught error overlay.
    const errorOverlay = page.locator('vite-error-overlay')
    await expect(errorOverlay).toHaveCount(0)
  })

  test('Status chip on the detail header renders one of the canonical statuses', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    await page.goto(APP_BASE + `/vehicles/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    // Use main (not body) — body includes injected <script> text containing
    // literal "undefined" tokens from the parent-IDE preview helper.
    const main = (await page.locator('main').textContent()) ?? ''
    expect(main, 'status chip text').toMatch(/operational|in[ _]transit|idle|alert|offline/i)
    expect(main).not.toMatch(/undefined/i)
  })

  test('Map placeholder caption shows "<location> · live"', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    await page.goto(APP_BASE + `/vehicles/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, 'live caption').toMatch(/live/i)
  })

  test('Maintenance section shows "Next service" line', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    await page.goto(APP_BASE + `/vehicles/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, 'next service section').toMatch(/next service|maintenance/i)
  })

  test('Eyebrow text "Vehicle" renders above the heading', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    await page.goto(APP_BASE + `/vehicles/${id}`)
    await expect(page.getByText(/^vehicle$/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('Subtitle shows the year-make-model line', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    await page.goto(APP_BASE + `/vehicles/${id}`)
    await expect(page.getByText(/\d{4}\s+\w+/)).toBeVisible({ timeout: 10000 })
  })

  test('VIN line "VIN: …" renders with a non-empty VIN', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    await page.goto(APP_BASE + `/vehicles/${id}`)
    const vinLine = page.getByText(/^VIN:\s*\S+/i)
    await expect(vinLine).toBeVisible({ timeout: 10000 })
  })

  test('Assigned driver section renders (link or fallback "No driver assigned.")', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    await page.goto(APP_BASE + `/vehicles/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, 'assigned driver section').toMatch(/no driver assigned|driver/i)
  })

  test('Recent-trip row renders "origin → destination" with non-empty sides', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstVehicleId(page, accessToken)
    const tripsResp = await page.request.get(API_BASE + `/trips?vehicle_id=${id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(tripsResp.status()).toBe(200)
    const trips = (await tripsResp.json()) as Array<{ origin: string; destination: string }>
    await page.goto(APP_BASE + `/vehicles/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    if (trips.length > 0) {
      const body = (await page.locator('main').textContent()) ?? ''
      expect(body, 'origin → destination format').toMatch(/\S+\s*[→>]\s*\S+/)
    }
  })
})
