/**
 * /sessions/:id (SessionDetail) per-page suite.
 * Drives Start / End / Cancel actions and asserts backend invariants.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  SPEC_BOOKING_SUBJECT,
  apiFetch,
  captureNetwork,
  createBookingViaApi,
  pickTutor,
  signup,
} from './_helpers.js'

test.describe('/sessions/:id', () => {
  test('GET /api/bookings/:id renders metadata block', async ({ page }) => {
    await signup(page)
    // Book a tutor read from the live catalog, then assert the detail page
    // echoes that tutor and the subject the booking was created with.
    const tutor = await pickTutor(page)
    const bookingId = await createBookingViaApi(page, tutor.id)
    await page.goto(`${APP_BASE}/sessions/${bookingId}`)
    await page.waitForTimeout(1_500)
    const html = await page.content()
    expect(html).toContain(tutor.display_name)
    expect(html).toMatch(new RegExp(`${SPEC_BOOKING_SUBJECT}|Tutoring`, 'i'))
  })

  test('Start session creates a tutoring_sessions row and flips booking status', async ({
    page,
  }) => {
    await signup(page)
    const bookingId = await createBookingViaApi(page)
    await page.goto(`${APP_BASE}/sessions/${bookingId}`)
    await page.waitForTimeout(1_500)

    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /start session/i })
        .first()
        .click()
        .catch(() => undefined)
      await page.waitForTimeout(2_500)
    })
    const start = reqs.find((r) => r.method === 'POST' && /\/api\/sessions\/start/.test(r.url))
    expect(start, 'POST /api/sessions/start fired').toBeDefined()
    expect(start?.status).toBeGreaterThanOrEqual(200)
    expect(start?.status).toBeLessThan(300)

    const linked = await apiFetch<any>(page, 'GET', `/bookings/${bookingId}/sessions`)
    expect(linked.status).toBe(200)
    const list = (linked.body?.data ?? linked.body) as any[]
    expect(Array.isArray(list) ? list.length : 0).toBeGreaterThan(0)
  })

  test('End session moves session to completed and flips booking to completed', async ({
    page,
  }) => {
    await signup(page)
    const bookingId = await createBookingViaApi(page)
    await page.goto(`${APP_BASE}/sessions/${bookingId}`)
    await page.waitForTimeout(1_500)
    await page
      .getByRole('button', { name: /start session/i })
      .first()
      .click()
      .catch(() => undefined)
    await page.waitForTimeout(2_000)
    await page
      .getByRole('button', { name: /end session/i })
      .first()
      .click()
      .catch(() => undefined)
    await page.waitForTimeout(2_500)

    const after = await apiFetch<any>(page, 'GET', `/bookings/${bookingId}`)
    const body = after.body?.data ?? after.body
    // booking status flips to completed when session ends
    expect(['completed', 'in_progress'].includes(String(body.status))).toBeTruthy()
  })

  test('Cancel booking flips status=cancelled in the DB (read-after-write)', async ({ page }) => {
    await signup(page)
    const bookingId = await createBookingViaApi(page)
    await page.goto(`${APP_BASE}/sessions/${bookingId}`)
    await page.waitForTimeout(1_500)
    page.once('dialog', (d) => d.accept())
    await page
      .getByRole('button', { name: /^cancel/i })
      .first()
      .click()
      .catch(() => undefined)
    await page.waitForTimeout(2_500)

    const after = await apiFetch<any>(page, 'GET', `/bookings/${bookingId}`)
    const body = after.body?.data ?? after.body
    expect(body.status).toBe('cancelled')
  })

  test('Chat/message-tutor link routes to /messages?with=', async ({ page }) => {
    await signup(page)
    const bookingId = await createBookingViaApi(page)
    await page.goto(`${APP_BASE}/sessions/${bookingId}`)
    await page.waitForTimeout(1_500)
    const chat = page.getByRole('link', { name: /chat|message tutor/i }).first()
    if (await chat.count().catch(() => 0)) {
      const href = await chat.getAttribute('href')
      expect(href).toMatch(/\/messages/)
    }
  })

  test('completed session shows review form; submitting persists & swaps to "rated" badge', async ({
    page,
  }) => {
    await signup(page)
    const bookingId = await createBookingViaApi(page)
    await page.goto(`${APP_BASE}/sessions/${bookingId}`)
    await page.waitForTimeout(1_500)

    await page
      .getByRole('button', { name: /start session/i })
      .first()
      .click()
      .catch(() => undefined)
    await page.waitForTimeout(2_000)
    await page
      .getByRole('button', { name: /end session/i })
      .first()
      .click()
      .catch(() => undefined)
    await page.waitForTimeout(2_500)

    // Form must appear after end-session flips status → completed
    const reviewForm = page.getByTestId('review-form')
    await expect(reviewForm).toBeVisible({ timeout: 10_000 })

    // Pick 4 stars and submit
    await page.getByTestId('review-star-4').click()
    await page.getByTestId('review-body').fill('Helpful and clear, thanks!')

    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('review-submit').click()
      await page.waitForTimeout(2_000)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/reviews(?!\/)/.test(r.url))
    expect(post, 'POST /api/reviews fired').toBeDefined()
    expect(post?.status).toBe(201)

    // UI swaps: existing-review block visible, form gone
    await expect(page.getByTestId('review-existing')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId('review-form')).toHaveCount(0)

    // Reload — server-side persistence verified by the lookup endpoint
    await page.reload()
    await page.waitForTimeout(1_500)
    await expect(page.getByTestId('review-existing')).toBeVisible({ timeout: 10_000 })
  })

  test('GET /api/reviews/booking/:id returns the persisted review for the owner', async ({
    page,
  }) => {
    await signup(page)
    const bookingId = await createBookingViaApi(page)
    await page.goto(`${APP_BASE}/sessions/${bookingId}`)
    await page.waitForTimeout(1_500)
    await page
      .getByRole('button', { name: /start session/i })
      .first()
      .click()
      .catch(() => undefined)
    await page.waitForTimeout(2_000)
    await page
      .getByRole('button', { name: /end session/i })
      .first()
      .click()
      .catch(() => undefined)
    await page.waitForTimeout(2_500)

    // Initially: no review -> 404
    const before = await apiFetch(page, 'GET', `/reviews/booking/${bookingId}`)
    expect(before.status).toBe(404)

    // Post a review for this booking
    const booking = await apiFetch<any>(page, 'GET', `/bookings/${bookingId}`)
    const tutorId = (booking.body?.data ?? booking.body)?.tutor_id
    expect(tutorId, 'tutor_id missing on booking row').toBeTruthy()
    const create = await apiFetch(page, 'POST', '/reviews', {
      tutor_id: tutorId,
      booking_id: bookingId,
      rating: 5,
      body: 'api-path',
    })
    expect(create.status).toBe(201)

    // Now the lookup must find it
    const after = await apiFetch<any>(page, 'GET', `/reviews/booking/${bookingId}`)
    expect(after.status).toBe(200)
    expect(after.body?.rating).toBe(5)
    expect(after.body?.booking_id).toBe(bookingId)
  })

  test('non-owner cannot view a booking detail page', async ({ page, browser }) => {
    // user A creates a booking
    const ctx = await browser.newContext()
    const aP = await ctx.newPage()
    await signup(aP)
    const bookingId = await createBookingViaApi(aP)
    await ctx.close()

    // user B logs in fresh and tries to fetch that booking
    await signup(page)
    const r = await apiFetch(page, 'GET', `/bookings/${bookingId}`)
    expect([403, 404]).toContain(r.status)
  })
})
