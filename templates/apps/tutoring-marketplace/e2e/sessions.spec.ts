/**
 * /sessions and /sessions/:id — student view of bookings.
 * Asserts created bookings appear in the list, tabs filter correctly, and
 * the detail page exposes start/end/cancel CTAs that mutate real DB state.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  SPEC_BOOKING_SUBJECT,
  apiFetch,
  captureNetwork,
  createBookingViaApi,
  signup,
} from './_helpers.js'

test('sessions empty state for a brand-new user', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/sessions')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByText(/Nothing scheduled here yet|loading sessions/i).first()).toBeVisible()
})

test('a created booking shows up under Upcoming', async ({ page }) => {
  await signup(page)
  await createBookingViaApi(page)
  await page.goto(APP_BASE + '/sessions')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  // Default tab is Upcoming
  const html = await page.content()
  // The subject this spec itself booked.
  expect(html).toMatch(new RegExp(`${SPEC_BOOKING_SUBJECT}|Tutoring session`, 'i'))
})

test('switching to Past tab shows no rows for a fresh booking', async ({ page }) => {
  await signup(page)
  await createBookingViaApi(page)
  await page.goto(APP_BASE + '/sessions')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /^past$/i })
    .first()
    .click()
  await page.waitForTimeout(500)
  const html = await page.content()
  expect(html).toMatch(/Nothing scheduled here yet/i)
})

test('Sessions detail page loads booking + lets us cancel it', async ({ page }) => {
  await signup(page)
  const bookingId = await createBookingViaApi(page)
  await page.goto(APP_BASE + '/sessions/' + bookingId)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })

  // Should show the upcoming status pill + cancel button
  await expect(page.getByText(/Upcoming/).first()).toBeVisible()
  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('cancel-booking').click()
    await page.waitForTimeout(2_000)
  })
  const put = reqs.find(
    (r) => r.method === 'PUT' && /\/api\/bookings\//.test(r.url) && /cancel/.test(r.url),
  )
  expect(put?.status).toBe(200)
  const after = await apiFetch<any>(page, 'GET', `/bookings/${bookingId}`)
  expect(after.body.status).toBe('cancelled')
})

test('Start session creates a tutoring_sessions row + flips booking status', async ({ page }) => {
  await signup(page)
  const bookingId = await createBookingViaApi(page)
  await page.goto(APP_BASE + '/sessions/' + bookingId)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })

  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /start session/i })
      .first()
      .click()
    await page.waitForTimeout(2_500)
  })
  const start = reqs.find((r) => r.method === 'POST' && /\/api\/sessions\/start/.test(r.url))
  expect(start?.status).toBe(201)

  // Booking status flipped to in_progress
  const after = await apiFetch<any>(page, 'GET', `/bookings/${bookingId}`)
  expect(after.body.status).toBe('in_progress')
})

test('End session moves session to completed + booking to completed', async ({ page }) => {
  await signup(page)
  const bookingId = await createBookingViaApi(page)
  // Start via API to avoid waiting on UI state
  await page.goto(APP_BASE + '/sessions/' + bookingId)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /start session/i })
    .first()
    .click()
  await page.waitForTimeout(2_000)
  // Now End
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /end session/i })
      .first()
      .click()
    await page.waitForTimeout(2_500)
  })
  const end = reqs.find((r) => r.method === 'POST' && /\/api\/sessions\/[^/]+\/end/.test(r.url))
  expect(end?.status).toBe(200)
  const after = await apiFetch<any>(page, 'GET', `/bookings/${bookingId}`)
  expect(after.body.status).toBe('completed')
})

test('non-owner cannot view a booking detail page', async ({ page, browser }) => {
  // The 404 for a non-owner is the assertion target; the browser still logs it
  // as a console error, so allow exactly that.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: /status of 40[34]/,
  })
  // create booking as user A
  const ctxA = await browser.newContext()
  const pa = await ctxA.newPage()
  await signup(pa)
  const bookingId = await createBookingViaApi(pa)
  await ctxA.close()

  // sign up as user B and try to fetch the detail
  await signup(page)
  const r = await apiFetch(page, 'GET', '/bookings/' + bookingId)
  expect([403, 404]).toContain(r.status)
})
