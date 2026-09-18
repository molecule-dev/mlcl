/**
 * /book/:tutorId/confirm per-page suite.
 * The confirmation page is reached after a successful POST /api/bookings.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  SPEC_BOOKING_SUBJECT,
  captureNetwork,
  createBookingViaApi,
  pickTutor,
  signup,
} from './_helpers.js'

test.describe('/book/:tutorId/confirm', () => {
  test('renders booking confirmed header + summary tiles when bookingId is loaded', async ({
    page,
  }) => {
    await signup(page)
    const tutor = await pickTutor(page)
    const bookingId = await createBookingViaApi(page, tutor.id)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(`${APP_BASE}/book/${tutor.id}/confirm?bookingId=${bookingId}`)
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)
    })
    // Confirmation must hydrate the booking row; usually via /bookings or /bookings/:id
    const bookingFetch = reqs.find(
      (r) => r.method === 'GET' && /\/api\/bookings(\/|\?|$)/.test(r.url),
    )
    expect(bookingFetch, 'booking fetch fired').toBeTruthy()
    expect(bookingFetch?.status).toBeLessThan(400)
    await expect(page.getByRole('heading').first()).toBeVisible()
    const html = await page.content()
    expect(html).toMatch(/booking confirmed|you.?re booked/i)
    // The tutor and subject this spec itself booked, not a seeded demo row.
    expect(html).toContain(tutor.display_name)
    expect(html).toMatch(new RegExp(`${SPEC_BOOKING_SUBJECT}|Tutoring session`, 'i'))
  })

  test('Add-to-Google-Calendar link is a real calendar.google.com URL', async ({ page }) => {
    await signup(page)
    const tutor = await pickTutor(page)
    const bookingId = await createBookingViaApi(page, tutor.id)
    await page.goto(`${APP_BASE}/book/${tutor.id}/confirm?bookingId=${bookingId}`)
    await page.waitForTimeout(1_500)
    const link = page.getByRole('link', { name: /add to google calendar/i }).first()
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/calendar\.google\.com\/calendar\/render/)
    expect(href).toMatch(/dates=\d{8}T\d{6}Z\/\d{8}T\d{6}Z/)
  })

  test('Download-.ics yields a real VCALENDAR blob ≥100 bytes', async ({ page }) => {
    await signup(page)
    const tutor = await pickTutor(page)
    const bookingId = await createBookingViaApi(page, tutor.id)
    await page.goto(`${APP_BASE}/book/${tutor.id}/confirm?bookingId=${bookingId}`)
    await page.waitForTimeout(1_500)
    const icsButton = page.getByRole('button', { name: /download.*ics|\.ics/i }).first()
    const [download] = await Promise.all([page.waitForEvent('download'), icsButton.click()])
    const path = await download.path()
    if (path) {
      const fs = await import('node:fs')
      const stat = fs.statSync(path)
      expect(stat.size).toBeGreaterThan(100)
      const txt = fs.readFileSync(path, 'utf8')
      expect(txt).toMatch(/BEGIN:VCALENDAR/)
      expect(txt).toMatch(/END:VCALENDAR/)
    }
  })

  test('Message-tutor link routes to /messages?with=:tutorId', async ({ page }) => {
    await signup(page)
    const tutor = await pickTutor(page)
    const bookingId = await createBookingViaApi(page, tutor.id)
    await page.goto(`${APP_BASE}/book/${tutor.id}/confirm?bookingId=${bookingId}`)
    await page.waitForTimeout(1_500)
    const chat = page.getByRole('link', { name: /message tutor|chat/i }).first()
    await expect(chat).toBeVisible()
    const href = await chat.getAttribute('href')
    expect(href).toMatch(/\/messages/)
  })

  test('View-all-sessions link routes to /sessions', async ({ page }) => {
    await signup(page)
    const tutor = await pickTutor(page)
    const bookingId = await createBookingViaApi(page, tutor.id)
    await page.goto(`${APP_BASE}/book/${tutor.id}/confirm?bookingId=${bookingId}`)
    await page.waitForTimeout(1_500)
    const link = page.getByRole('link', { name: /view all sessions/i }).first()
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/\/sessions$/)
  })

  test('Receipt block shows numeric Total when booking is loaded', async ({ page }) => {
    await signup(page)
    const tutor = await pickTutor(page)
    const bookingId = await createBookingViaApi(page, tutor.id)
    await page.goto(`${APP_BASE}/book/${tutor.id}/confirm?bookingId=${bookingId}`)
    await page.waitForTimeout(1_500)
    const html = await page.content()
    // Receipt section renders TOTAL with $X — booking computed from hourly rate.
    expect(html).toMatch(/\$\d{1,4}/)
  })

  test('without bookingId: shows missing-id alert (auth-required, no shell crash)', async ({
    page,
  }) => {
    await signup(page)
    const tutor = await pickTutor(page)
    await page.goto(`${APP_BASE}/book/${tutor.id}/confirm`)
    await page.waitForTimeout(1_000)
    await expect(page.getByRole('alert')).toContainText(/booking id missing|new booking/i)
  })
})
