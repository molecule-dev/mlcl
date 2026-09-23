/**
 * /api/reviews — write-after-read invariants for tutor reviews.
 * Asserts students can only review completed bookings; the tutor's
 * rating_average is recomputed after a review lands.
 *
 * The tutor is read from the live catalog rather than named — the demo
 * tutors are replaced as soon as the app has real ones.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiFetch,
  createBookingViaApi,
  pickTutor,
  signup,
  uniqueEmail,
} from './_helpers.js'

test('cannot review a tutor with a non-completed booking', async ({ page }) => {
  // The 4xx here is the assertion target; the browser still logs it as a
  // console error, so allow exactly that.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: /status of 400/,
  })
  await signup(page, uniqueEmail('student'))
  const tutor = await pickTutor(page)
  const bookingId = await createBookingViaApi(page, tutor.id)
  const r = await apiFetch(page, 'POST', '/reviews', {
    tutor_id: tutor.id,
    booking_id: bookingId,
    rating: 5,
    body: 'great session',
  })
  expect(r.status).toBe(400)
})

test('review without a booking_id is allowed and updates rating_average', async ({ page }) => {
  await signup(page, uniqueEmail('student2'))
  const tutor = await pickTutor(page)

  const before = await apiFetch<any>(page, 'GET', '/tutors/' + tutor.id)
  const beforeAvg = Number(before.body.rating_average ?? 0)
  const beforeCount = Number(before.body.rating_count ?? 0)

  const r = await apiFetch(page, 'POST', '/reviews', {
    tutor_id: tutor.id,
    rating: 5,
    body: 'review without booking',
  })
  expect(r.status).toBe(201)

  const after = await apiFetch<any>(page, 'GET', '/tutors/' + tutor.id)
  const afterCount = Number(after.body.rating_count ?? 0)
  expect(afterCount).toBe(beforeCount + 1)
  // The aggregate is folded in incrementally — check the exact recomputed
  // average against the numbers we just read back, not a fixed seed value.
  const expectedAvg = Math.round(((beforeAvg * beforeCount + 5) / (beforeCount + 1)) * 100) / 100
  expect(Number(after.body.rating_average)).toBeCloseTo(expectedAvg, 2)
})

test('GET /api/reviews/tutor/:id is public and returns rows', async ({ page, browser }) => {
  // Create the row through the product first — a replaced catalog starts with
  // no reviews, so the spec must not assume a seeded one exists. The author
  // signs in from a separate context so the read below stays unauthenticated.
  const tutor = await pickTutor(page)
  const body = `public review listing ${Date.now()}`
  const ctx = await browser.newContext()
  const authorPage = await ctx.newPage()
  await signup(authorPage, uniqueEmail('student3'))
  const created = await apiFetch(authorPage, 'POST', '/reviews', {
    tutor_id: tutor.id,
    rating: 4,
    body,
  })
  expect(created.status).toBe(201)
  await ctx.close()

  // Visit a real page so apiFetch's page.evaluate(fetch) has a valid origin.
  await page.goto(APP_BASE + '/')
  const r = await apiFetch<any[]>(page, 'GET', '/reviews/tutor/' + tutor.id)
  expect(r.status).toBe(200)
  expect(Array.isArray(r.body)).toBe(true)
  expect(r.body.map((rv: any) => rv.body)).toContain(body)
})
