import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authedApi, nextMondayISO, signup } from './_helpers.js'

test.describe('Meeting detail', () => {
  test('shows real booking and cancellation flips status', async ({ page, request }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const etRes = await api.post('/event-types', {
      name: 'Detail Test',
      slug: 'det-' + Date.now(),
      duration_minutes: 30,
      location_kind: 'jitsi',
      is_active: true,
    })
    const et = await etRes.json()
    const startAt = `${nextMondayISO()}T14:00:00.000Z`
    const book = await request.post(API_BASE + '/bookings/public', {
      data: {
        event_type_slug: et.slug,
        start_at: startAt,
        invitee_name: 'Detail Invitee',
        invitee_email: `detail+${Date.now()}@example.com`,
        invitee_timezone: 'UTC',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(book.status()).toBe(201)
    const created = await book.json()
    const bookingId = created.booking.id

    await page.goto(APP_BASE + `/bookings/${bookingId}`)
    await expect(page.getByTestId('meeting-detail-invitee')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('meeting-detail-status')).toContainText(/scheduled/i)

    // Shared ConfirmButton replaced the native confirm(): the first click
    // arms, the confirm label replaces the idle label, the second commits.
    const cancelBtn = page.locator('[data-mol-id="meeting-cancel"]')
    await cancelBtn.click()
    await expect(cancelBtn).toHaveText(/cancel this meeting\?/i)
    await cancelBtn.click()
    await expect(page.getByTestId('meeting-detail-status')).toContainText(/cancelled/i, {
      timeout: 10000,
    })

    const refresh = await api.get(`/bookings/${bookingId}`)
    expect(refresh.status()).toBe(200)
    const after = await refresh.json()
    expect(after.status).toBe('cancelled')
  })

  test('unknown id renders not-found state', async ({ page }) => {
    // The API 404s the unknown booking id by design; allow that expected
    // console error so the guard doesn't fail an intentional not-found flow.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await signup(page)
    await page.goto(APP_BASE + '/bookings/00000000-0000-0000-0000-000000000000')
    await expect(page.getByTestId('meeting-detail-not-found')).toBeVisible({ timeout: 10000 })
  })

  test('detail page renders status, invitee, and the back-to-list link', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const etRes = await api.post('/event-types', {
      name: 'Render Test',
      slug: 'render-' + Date.now(),
      duration_minutes: 30,
      location_kind: 'jitsi',
      is_active: true,
    })
    const et = await etRes.json()
    const book = await request.post(API_BASE + '/bookings/public', {
      data: {
        event_type_slug: et.slug,
        start_at: `${nextMondayISO()}T15:00:00.000Z`,
        invitee_name: 'Renders Right',
        invitee_email: `render+${Date.now()}@example.com`,
        invitee_timezone: 'UTC',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(book.status()).toBe(201)
    const created = await book.json()

    await page.goto(APP_BASE + `/bookings/${created.booking.id}`)
    await expect(page.getByTestId('meeting-detail-invitee')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('meeting-detail-status')).toBeVisible()
  })
})
