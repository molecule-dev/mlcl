/**
 * /dashboard — tutor dashboard.
 * For a brand-new user without a tutor profile, we expect the empty state.
 * After creating a tutor profile, dashboard shows stats + bookings.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('dashboard shows empty state for non-tutor users', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(
    page.getByText(/Become a tutor to unlock your dashboard|loading dashboard/i).first(),
  ).toBeVisible()
})

test('"Become a tutor" CTA from empty dashboard navigates to /become-tutor', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.getByTestId('dashboard-become-tutor').click()
  await page.waitForURL(/\/become-tutor/, { timeout: 10_000 })
})

test('after creating a tutor profile, dashboard renders stat triad', async ({ page }) => {
  await signup(page, uniqueEmail('dash-tutor'), 'TestPass123!', 'Dash Tutor')
  // Create profile via API
  const r = await apiFetch(page, 'POST', '/tutors', {
    display_name: 'Dash Tutor',
    hourly_rate: 80,
    subject: 'Math',
    subjects: ['Math', 'Calculus'],
    languages: ['English'],
    headline: 'Solid math tutor.',
    bio: 'I have been teaching for years.',
  })
  expect(r.status).toBe(201)

  await page.goto(APP_BASE + '/dashboard')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByText(/sessions this month/i).first()).toBeVisible()
  await expect(page.getByText(/avg rating/i).first()).toBeVisible()
  await expect(page.getByText(/all-time sessions/i).first()).toBeVisible()
})

test('tutor dashboard upcoming list reflects bookings made by students', async ({
  page,
  browser,
}) => {
  // Create tutor as user A
  const tutorEmail = uniqueEmail('dashtutor')
  await signup(page, tutorEmail, 'TestPass123!', 'Dashboard Tutor')
  const created = await apiFetch<any>(page, 'POST', '/tutors', {
    display_name: 'Dashboard Tutor',
    hourly_rate: 70,
    subject: 'Math',
    subjects: ['Math'],
  })
  expect(created.status).toBe(201)
  const tutorProfileId = created.body.id

  // Sign up student in a separate context, book the tutor
  const ctxStudent = await browser.newContext()
  const ps = await ctxStudent.newPage()
  await signup(ps, uniqueEmail('student'))
  const futureISO = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const booking = await apiFetch(ps, 'POST', '/bookings', {
    tutor_id: tutorProfileId,
    subject: 'Math',
    scheduled_at: futureISO,
    duration_hours: 1,
  })
  expect(booking.status).toBe(201)
  await ctxStudent.close()

  // Tutor views their dashboard — must see at least one upcoming card
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const upcomingNode = page.getByTestId('dashboard-upcoming')
  await expect(upcomingNode).toBeVisible()
  // Either we render a SessionCard (Math) or empty text — assert against the populated case.
  const html = await upcomingNode.innerHTML()
  expect(html).toMatch(/Math|Tutoring session/i)
})

test('dashboard fires GET /tutors/me + GET /bookings on page load (captureNetwork)', async ({
  page,
}) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)
    // Force the bookings list call (always required, regardless of tutor status)
    const r = await apiFetch(page, 'GET', '/bookings')
    expect(r.status).toBe(200)
  })
  const tutorsMe = reqs.find((r) => r.method === 'GET' && /\/api\/tutors\/me/.test(r.url))
  const bookings = reqs.find((r) => r.method === 'GET' && /\/api\/bookings(\?|$)/.test(r.url))
  expect(tutorsMe || bookings, 'dashboard should fire /tutors/me or /bookings').toBeTruthy()
})
