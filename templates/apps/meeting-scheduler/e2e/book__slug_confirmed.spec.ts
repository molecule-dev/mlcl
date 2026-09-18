/**
 * /book/:slug/confirmed?token=... — public booking confirmation.
 *
 * Verifies the page reads the booking by token, renders details, exposes
 * "Add to calendar" controls, and lets the invitee cancel.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  nextMondayISO,
  seedHostWithEventType,
  uniqueEmail,
} from './_helpers.js'

async function bookOne(request: import('@playwright/test').APIRequestContext, slug: string) {
  const startAt = `${nextMondayISO()}T11:00:00.000Z`
  const res = await request.post(API_BASE + '/bookings/public', {
    data: {
      event_type_slug: slug,
      start_at: startAt,
      invitee_name: 'Confirm Tester',
      invitee_email: uniqueEmail('confirm'),
      invitee_timezone: 'UTC',
    },
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(201)
  return (await res.json()) as { cancellationToken: string; booking: { id: string } }
}

test.describe('Booking confirmation — /book/:slug/confirmed', () => {
  test('reads back the booking by token and renders the scheduled time', async ({
    page,
    request,
  }) => {
    const seed = await seedHostWithEventType(request)
    const { cancellationToken } = await bookOne(request, seed.slug)

    await page.goto(APP_BASE + `/book/${seed.slug}/confirmed?token=${cancellationToken}`)
    await expect(page.getByTestId('booking-confirmation-status')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('booking-confirmation-time')).toBeVisible()
  })

  test('Add-to-Google + Download-.ics buttons are visible', async ({ page, request }) => {
    const seed = await seedHostWithEventType(request)
    const { cancellationToken } = await bookOne(request, seed.slug)
    await page.goto(APP_BASE + `/book/${seed.slug}/confirmed?token=${cancellationToken}`)
    await expect(page.getByTestId('add-to-google')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('download-ics')).toBeVisible()
  })

  test('cancel-booking flips status and updates the page in place', async ({ page, request }) => {
    const seed = await seedHostWithEventType(request)
    const { cancellationToken } = await bookOne(request, seed.slug)
    await page.goto(APP_BASE + `/book/${seed.slug}/confirmed?token=${cancellationToken}`)
    await expect(page.getByTestId('cancel-booking')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('cancel-booking').click()
    await page.waitForTimeout(1000)
    const refresh = await request.get(API_BASE + `/bookings/by-token/${cancellationToken}`)
    expect(refresh.status()).toBe(200)
    const body = (await refresh.json()) as { booking: { status: string } }
    expect(['cancelled', 'no_show']).toContain(body.booking.status)
  })

  test('missing token shows the not-found error path', async ({ page, request }) => {
    const seed = await seedHostWithEventType(request)
    await page.goto(APP_BASE + `/book/${seed.slug}/confirmed`)
    await expect(page.getByTestId('booking-confirmation-error')).toBeVisible({ timeout: 10000 })
  })

  test('"Book another time" link routes back to /book/:slug', async ({ page, request }) => {
    const seed = await seedHostWithEventType(request)
    const { cancellationToken } = await bookOne(request, seed.slug)
    await page.goto(APP_BASE + `/book/${seed.slug}/confirmed?token=${cancellationToken}`)
    await page.getByRole('link', { name: /book another time/i }).click()
    await expect(page).toHaveURL(new RegExp(`/book/${seed.slug}$`))
  })
})
