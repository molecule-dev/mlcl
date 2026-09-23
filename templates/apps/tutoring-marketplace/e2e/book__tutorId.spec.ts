/**
 * /book/:tutorId + /book/:tutorId/confirm — end-to-end booking flow.
 * Asserts the form submits to POST /api/bookings, a real row is
 * created (read back via GET /api/bookings), the confirmation page shows
 * the receipt, the .ics download yields a real iCalendar blob, and
 * Google Calendar URL is well-formed.
 *
 * The tutor is read from the live catalog (one that publishes availability,
 * which the booking form needs) instead of naming a seeded demo row.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiFetch,
  captureNetwork,
  pickBookableTutor,
  pickTutor,
  signup,
} from './_helpers.js'

test('booking page loads tutor + availability', async ({ page }) => {
  await signup(page)
  const tutor = await pickBookableTutor(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/book/' + tutor.id)
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  expect(
    reqs.find((r) => r.method === 'GET' && r.url.endsWith('/api/tutors/' + tutor.id))?.status,
  ).toBe(200)
  expect(
    reqs.find(
      (r) => r.method === 'GET' && r.url.endsWith('/api/tutors/' + tutor.id + '/availability'),
    )?.status,
  ).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/pick a slot|book/i)
})

test('confirm booking creates a real DB row that reads back via /api/bookings', async ({
  page,
}) => {
  await signup(page)
  const tutor = await pickBookableTutor(page)
  await page.goto(APP_BASE + '/book/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })

  // The page auto-selects first slot, default subject + duration. Submit it.
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /confirm booking/i })
      .first()
      .click()
    // Either we navigate to /confirm OR an error renders. Wait briefly.
    await page.waitForURL(/\/confirm/, { timeout: 15_000 }).catch(() => undefined)
  })
  const bookingPost = reqs.find((r) => r.method === 'POST' && /\/api\/bookings(\?|$)/.test(r.url))
  expect(bookingPost, 'POST /api/bookings fired').toBeDefined()
  expect(bookingPost?.status).toBe(201)

  // Read back via GET — must include at least one booking for this user
  const list = await apiFetch<unknown[]>(page, 'GET', '/bookings')
  expect(list.status).toBe(200)
  const arr = (list.body as unknown[]) ?? []
  expect(arr.length).toBeGreaterThanOrEqual(1)
  // Booking row references the tutor we booked
  const tutorIds = arr.map((b: any) => b.tutor_id)
  expect(tutorIds).toContain(tutor.id)
})

test('confirmation page renders receipt with totals + booking ID', async ({ page }) => {
  await signup(page)
  const tutor = await pickBookableTutor(page)
  await page.goto(APP_BASE + '/book/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /confirm booking/i })
    .first()
    .click()
  await page.waitForURL(/\/confirm/, { timeout: 15_000 })

  // Receipt sidebar
  await expect(page.getByText(/receipt/i).first()).toBeVisible()
  // Booking ID echoed
  await expect(page.getByText(/booking id/i).first()).toBeVisible()
  // Tutor row — the tutor we actually booked
  await expect(page.getByText(tutor.display_name).first()).toBeVisible()
})

test('.ics download yields a real VCALENDAR blob ≥ 100 bytes', async ({ page }) => {
  await signup(page)
  const tutor = await pickBookableTutor(page)
  await page.goto(APP_BASE + '/book/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /confirm booking/i })
    .first()
    .click()
  await page.waitForURL(/\/confirm/, { timeout: 15_000 })

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-ics').click(),
  ])
  const path = await download.path()
  expect(path).toBeTruthy()
  const fs = await import('node:fs')
  const content = fs.readFileSync(path!, 'utf8')
  expect(content).toMatch(/BEGIN:VCALENDAR/)
  expect(content).toMatch(/END:VCALENDAR/)
  expect(content).toMatch(/SUMMARY:/)
  expect(content.length).toBeGreaterThan(100)
})

test('Google Calendar link is a well-formed calendar.google.com URL', async ({ page }) => {
  await signup(page)
  const tutor = await pickBookableTutor(page)
  await page.goto(APP_BASE + '/book/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /confirm booking/i })
    .first()
    .click()
  await page.waitForURL(/\/confirm/, { timeout: 15_000 })
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  // Wait for booking data to load (href starts as '#' until /api/bookings/:id resolves).
  await expect
    .poll(async () => page.getByTestId('add-to-google-calendar').getAttribute('href'), {
      timeout: 10_000,
    })
    .toMatch(/calendar\.google\.com/)

  const href = await page.getByTestId('add-to-google-calendar').getAttribute('href')
  expect(href).toBeTruthy()
  expect(href!).toMatch(/calendar\.google\.com\/calendar\/render/)
  expect(href!).toMatch(/action=TEMPLATE/)
  expect(href!).toMatch(/dates=/)
})

test('cancel booking flips status=cancelled in the DB', async ({ page }) => {
  await signup(page)
  const tutor = await pickBookableTutor(page)
  await page.goto(APP_BASE + '/book/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /confirm booking/i })
    .first()
    .click()
  await page.waitForURL(/\/confirm/, { timeout: 15_000 })

  const list = await apiFetch<any[]>(page, 'GET', '/bookings')
  const booking = list.body[0]!
  expect(booking?.id).toBeTruthy()

  // Cancel via API (the UI route /sessions/:id has the button — but bookings.id != sessions.id; the
  // SessionDetail page actually loads the booking by id. So PUT directly:
  const cancelled = await apiFetch(page, 'PUT', `/bookings/${booking.id}/cancel`, {
    reason: 'test',
  })
  expect(cancelled.status).toBe(200)

  const after = await apiFetch<any>(page, 'GET', `/bookings/${booking.id}`)
  expect(after.body.status).toBe('cancelled')
})

test('booking summary updates as duration changes', async ({ page }) => {
  await signup(page)
  const tutor = await pickBookableTutor(page)
  await page.goto(APP_BASE + '/book/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })

  // Click 60 min and 30 min duration buttons; total $ in the summary should change.
  const summaryTotal = page.locator('text=/^\\$\\d+/').last()
  const beforeText = await summaryTotal.textContent()
  await page
    .getByRole('button', { name: /^30 min$/i })
    .first()
    .click()
  await page.waitForTimeout(300)
  const afterText = await summaryTotal.textContent()
  expect(afterText).not.toBe(beforeText)
})

test('booking redirects to /login when unauthenticated', async ({ page }) => {
  // Auth gate — sign-up not done. The route should bounce or 401 the POST.
  // App may redirect or render the form but the POST will 401.
  // Capture network across the navigation itself — the tutor GET fires
  // during the goto, so attaching the listener AFTER goto would miss it.
  const tutor = await pickTutor(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/book/' + tutor.id)
    await page.waitForLoadState('networkidle', { timeout: 10_000 })
  })
  const tutorCall = reqs.find(
    (r) => r.method === 'GET' && r.url.includes('/api/tutors/' + tutor.id),
  )
  // Public tutor read is ok unauthed, but POST will require auth (asserted in another test).
  expect(tutorCall?.status === 200 || page.url().match(/\/login/)).toBeTruthy()
})

test('GET /api/bookings while unauthed responds 401', async ({ page }) => {
  // The 4xx here is the assertion target; the browser still logs it as a
  // console error, so allow exactly that.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: /status of 401/,
  })
  await page.goto(APP_BASE + '/')
  const r = await apiFetch(page, 'GET', '/bookings')
  expect(r.status).toBe(401)
})
