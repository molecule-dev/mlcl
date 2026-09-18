import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authedApi,
  nextMondayISO,
  seedHostWithEventType,
  uniqueSlug,
} from './_helpers.js'

test.describe('Public booking flow', () => {
  test('unknown slug shows clear not-found state', async ({ page }) => {
    await page.goto(APP_BASE + `/book/${uniqueSlug('missing')}`)
    await expect(page.getByTestId('booking-page-error')).toBeVisible({ timeout: 10000 })
  })

  test('a real slot can be booked end-to-end and is read-after-write visible', async ({
    page,
    request,
  }) => {
    const seed = await seedHostWithEventType(request)

    await page.goto(APP_BASE + `/book/${seed.slug}`)
    await expect(page.getByTestId('booking-page-event')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('booking-page-host')).toBeVisible()

    // Click a weekday button (Mon-Fri have availability rules).
    // Try each of the next 14 days until we find one with at least one
    // available slot — avoids assumptions about what day the test runs.
    let clicked = false
    for (let i = 0; i < 14 && !clicked; i++) {
      await page.getByTestId(`day-${i}`).click()
      await page.waitForTimeout(800)
      const enabled = page
        .getByRole('option')
        .filter({ hasNotText: /booked/i })
        .first()
      if ((await enabled.count()) > 0) {
        await enabled.click()
        clicked = true
      }
    }
    expect(clicked, 'should find at least one bookable day in the next 14').toBe(true)

    await page.getByTestId('invitee-name').fill('Bob Tester')
    await page.getByTestId('invitee-email').fill('bob+' + Date.now() + '@example.com')

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/bookings/public') && r.request().method() === 'POST',
      ),
      page.getByTestId('booking-confirm').click(),
    ])
    expect(response.status(), 'POST /api/bookings/public should succeed').toBe(201)
    const body = await response.json()
    expect(body.cancellationToken).toBeTruthy()

    // Confirmation page reads the booking by token.
    await expect(page).toHaveURL(/\/book\/.+\/confirmed\?token=/, { timeout: 10000 })

    // And the host's authed list shows the booking.
    const api = await authedApi(request, seed.host.accessToken!)
    const list = await api.get('/bookings')
    expect(list.status()).toBe(200)
    const items = (await list.json()) as Array<{ id: string; status: string }>
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].status).toBe('scheduled')
  })

  test('cancellation via token flips status to cancelled', async ({ page, request }) => {
    const seed = await seedHostWithEventType(request)
    const startAt = `${nextMondayISO()}T10:00:00.000Z`
    const create = await request.post(API_BASE + '/bookings/public', {
      data: {
        event_type_slug: seed.slug,
        start_at: startAt,
        invitee_name: 'Cancel Tester',
        invitee_email: `cancel+${Date.now()}@example.com`,
        invitee_timezone: 'UTC',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(create.status()).toBe(201)
    const { cancellationToken } = await create.json()
    expect(cancellationToken).toBeTruthy()

    await page.goto(APP_BASE + `/book/${seed.slug}/confirmed?token=${cancellationToken}`)
    page.once('dialog', (d) => d.accept())
    const cancelButton = page
      .getByRole('button', { name: /cancel meeting|cancel booking/i })
      .first()
    await cancelButton.click()

    await page.waitForTimeout(1500)
    const refresh = await request.get(API_BASE + `/bookings/by-token/${cancellationToken}`)
    expect(refresh.status()).toBe(200)
    const body = (await refresh.json()) as { booking: { status: string } }
    expect(body.booking.status).toBe('cancelled')
  })

  test('event type metadata + host name render once /api/event-types/by-slug returns', async ({
    page,
    request,
  }) => {
    const seed = await seedHostWithEventType(request)
    await page.goto(APP_BASE + `/book/${seed.slug}`)
    await expect(page.getByTestId('booking-page-event')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('booking-page-host')).toBeVisible()
  })

  test('booking conflicts return 409', async ({ request }) => {
    const seed = await seedHostWithEventType(request)
    const startAt = `${nextMondayISO()}T10:30:00.000Z`
    const first = await request.post(API_BASE + '/bookings/public', {
      data: {
        event_type_slug: seed.slug,
        start_at: startAt,
        invitee_name: 'A',
        invitee_email: `first+${Date.now()}@example.com`,
        invitee_timezone: 'UTC',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(first.status()).toBe(201)
    const second = await request.post(API_BASE + '/bookings/public', {
      data: {
        event_type_slug: seed.slug,
        start_at: startAt,
        invitee_name: 'B',
        invitee_email: `second+${Date.now()}@example.com`,
        invitee_timezone: 'UTC',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(second.status(), 'duplicate slot must conflict').toBe(409)
  })
})
