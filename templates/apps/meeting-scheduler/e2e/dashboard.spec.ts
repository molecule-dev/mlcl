import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authedApi, nextMondayISO, signup } from './_helpers.js'

test.describe('Dashboard', () => {
  test('empty state with CTA when no bookings exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByTestId('dashboard-empty')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('dashboard-new-link')).toBeVisible()
  })

  test('upcoming list shows real bookings after one is created', async ({ page, request }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const etRes = await api.post('/event-types', {
      name: 'Discovery',
      slug: 'dash-' + Date.now(),
      duration_minutes: 30,
      location_kind: 'jitsi',
      is_active: true,
    })
    const et = await etRes.json()

    const startAt = `${nextMondayISO()}T11:00:00.000Z`
    const book = await request.post(API_BASE + '/bookings/public', {
      data: {
        event_type_slug: et.slug,
        start_at: startAt,
        invitee_name: 'Dash Invitee',
        invitee_email: `dash+${Date.now()}@example.com`,
        invitee_timezone: 'UTC',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(book.status()).toBe(201)

    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByTestId('dashboard-upcoming')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Dash Invitee').first()).toBeVisible()
  })

  test('KPI cards render with numbers', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByTestId('dashboard-kpis')).toBeVisible()
  })
})
