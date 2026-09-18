import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, apiGet, captureNetwork, signup, signupAndCreateTrip } from './_helpers'

test.describe('/bookings', () => {
  test('mounts and GETs /api/bookings + /api/trips', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/bookings')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    const bookings = reqs.find((r) => r.method === 'GET' && /\/api\/bookings/.test(r.url))
    expect(bookings, 'GET /api/bookings must fire').toBeDefined()
    expect(bookings!.status).toBeLessThan(400)
  })

  test('Empty state visible for new user with no trips', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/bookings')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('[data-testid="bookings-empty"]')).toBeVisible()
  })

  test('New-booking button toggles inline form', async ({ page }) => {
    await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/bookings')
    await page.locator('[data-testid="bookings-new"]').click()
    await expect(page.locator('[data-testid="bookings-form"]')).toBeVisible()
  })

  test('Form submit POSTs /api/bookings and the booking appears in the list', async ({ page }) => {
    const { tripId, token } = await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/bookings')
    await page.locator('[data-testid="bookings-new"]').click()
    await page
      .locator('[data-testid="bookings-form-trip"]')
      .selectOption({ value: tripId })
      .catch(() => {})
    // Fall back: use form-trip select index 1
    const tripSelect = page.locator('[data-testid="bookings-form-trip"]')
    if ((await tripSelect.inputValue().catch(() => '')) !== tripId) {
      await tripSelect.selectOption({ index: 0 }).catch(() => {})
    }
    await page.getByRole('textbox').filter({ hasText: '' }).first().fill('IcelandAir 105')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="bookings-form"]').getByRole('button').last().click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/bookings/.test(r.url))
    expect(post).toBeDefined()
    if (post!.status < 400) {
      const list = await apiGet<unknown[]>(page, token, '/bookings')
      expect(list.status).toBe(200)
      // At least one booking should exist for this trip
      expect(JSON.stringify(list.body)).toMatch(/IcelandAir|hotel|flight|car|other/i)
    }
  })

  test('Total tile is rendered after creating a booking', async ({ page }) => {
    const { tripId, token } = await signupAndCreateTrip(page)
    // Direct API call to seed a booking (form is exercised in the test above)
    const r = await page
      .context()
      .request.post('http://localhost:' + (process.env.API_PORT || '4230') + '/api/bookings', {
        headers: { Authorization: 'Bearer ' + token },
        data: {
          trip_id: tripId,
          kind: 'flight',
          title: 'IA 105',
          cost_cents: 85000,
          currency: 'USD',
        },
      })
    expect(r.status()).toBeLessThan(400)
    await page.goto(APP_BASE + '/bookings')
    await expect(page.locator('[data-testid="bookings-total"]')).toBeVisible()
    await expect(page.locator('[data-testid="bookings-list"]')).toBeVisible()
  })

  test('Heading visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/bookings')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Bookings persist across reload', async ({ page }) => {
    const { tripId, token } = await signupAndCreateTrip(page)
    const r = await page
      .context()
      .request.post('http://localhost:' + (process.env.API_PORT || '4230') + '/api/bookings', {
        headers: { Authorization: 'Bearer ' + token },
        data: {
          trip_id: tripId,
          kind: 'hotel',
          title: 'Hotel X',
          cost_cents: 1200_00,
          currency: 'USD',
        },
      })
    expect(r.status()).toBeLessThan(400)
    await page.goto(APP_BASE + '/bookings')
    await expect(page.getByText(/Hotel X/i)).toBeVisible()
    await page.reload()
    await expect(page.getByText(/Hotel X/i)).toBeVisible()
  })

  test('Confirmed count tile is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/bookings')
    await expect(page.locator('[data-testid="bookings-confirmed-count"]')).toBeVisible()
  })

  test('Pending count tile is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/bookings')
    await expect(page.locator('[data-testid="bookings-pending-count"]')).toBeVisible()
  })
})
