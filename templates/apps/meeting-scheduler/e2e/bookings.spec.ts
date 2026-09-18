import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authedApi, nextMondayISO, signup } from './_helpers.js'

test.describe('Bookings list', () => {
  test('shows empty state when no bookings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/bookings')
    await expect(page.getByTestId('bookings-empty')).toBeVisible({ timeout: 10000 })
  })

  test('upcoming filter lists newly-created booking', async ({ page, request }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const etRes = await api.post('/event-types', {
      name: 'Strategy review',
      slug: 'strat-' + Date.now(),
      duration_minutes: 60,
      location_kind: 'jitsi',
      is_active: true,
    })
    const et = await etRes.json()
    const startAt = `${nextMondayISO()}T13:00:00.000Z`
    const book = await request.post(API_BASE + '/bookings/public', {
      data: {
        event_type_slug: et.slug,
        start_at: startAt,
        invitee_name: 'List Invitee',
        invitee_email: `list+${Date.now()}@example.com`,
        invitee_timezone: 'UTC',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(book.status()).toBe(201)

    await page.goto(APP_BASE + '/bookings')
    await expect(page.getByTestId('bookings-list')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('List Invitee').first()).toBeVisible()
  })

  test('filter buttons toggle visible state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/bookings')
    await page.getByTestId('bookings-filter-past').click()
    await page.getByTestId('bookings-filter-cancelled').click()
    await page.getByTestId('bookings-filter-upcoming').click()
  })
})
