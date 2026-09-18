/**
 * /tutor/:id — public tutor profile.
 * Asserts the live DB row renders (headline/bio, hourly rate, subjects,
 * reviews) and the booking CTA navigates to /book/:id.
 *
 * The tutor under test is read from GET /api/tutors rather than named: the
 * demo tutors are the first rows an app's owner replaces, and a spec that
 * hard-codes a seeded uuid or display name then fails on a correct app.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiFetch,
  captureNetwork,
  getTutorDetail,
  pickBookableTutor,
  pickTutor,
  signup,
  uniqueEmail,
} from './_helpers.js'

test('tutor profile loads the live tutor row', async ({ page }) => {
  const tutor = await pickTutor(page)
  const detail = await getTutorDetail(page, tutor.id)

  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/tutor/' + tutor.id)
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const detailCall = reqs.find(
    (r) => r.method === 'GET' && r.url.endsWith('/api/tutors/' + tutor.id),
  )
  expect(detailCall?.status).toBe(200)
  const availabilityCall = reqs.find(
    (r) => r.method === 'GET' && r.url.endsWith('/api/tutors/' + tutor.id + '/availability'),
  )
  expect(availabilityCall?.status).toBe(200)

  await expect(page.getByRole('heading', { name: detail.display_name }).first()).toBeVisible()
  if (detail.headline) {
    await expect(page.getByText(detail.headline).first()).toBeVisible()
  }
  expect(await page.content()).toContain('$' + Number(detail.hourly_rate ?? 0))
})

test('reviews section renders the review bodies the API returns', async ({ page }) => {
  // Create the review through the product first: a brand-new catalog carries
  // no reviews, and the page falls back to sample ones when a tutor has none,
  // so only a review we posted proves the live rows are what renders.
  const tutor = await pickTutor(page)
  await signup(page, uniqueEmail('reviewer'))
  const body = `Clear, patient, and well paced ${Date.now()}`
  const posted = await apiFetch(page, 'POST', '/reviews', { tutor_id: tutor.id, rating: 5, body })
  expect(posted.status).toBe(201)

  await page.goto(APP_BASE + '/tutor/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByText(body).first()).toBeVisible({ timeout: 10_000 })
})

test('reviewer names from the tutor.reviews payload are visible', async ({ page }) => {
  // /api/tutors/:id inlines reviews with a resolved reviewer_name (no separate
  // /api/reviews/tutor/:id call), so post one and assert the author renders.
  const tutor = await pickTutor(page)
  const author = await signup(page, uniqueEmail('reviewer-name'))
  const posted = await apiFetch(page, 'POST', '/reviews', {
    tutor_id: tutor.id,
    rating: 5,
    body: `Named-reviewer check ${Date.now()}`,
  })
  expect(posted.status).toBe(201)

  await page.goto(APP_BASE + '/tutor/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByText(author.name).first()).toBeVisible({ timeout: 10_000 })
})

test('availability slots are rendered as bookable links', async ({ page }) => {
  const tutor = await pickBookableTutor(page)
  await page.goto(APP_BASE + '/tutor/' + tutor.id)
  // Don't rely on networkidle — the realtime socket keeps the network busy.
  // Wait for the availability API response then poll the DOM until the links land.
  await page.waitForResponse(
    (r) => r.url().endsWith(`/api/tutors/${tutor.id}/availability`) && r.status() === 200,
    { timeout: 15_000 },
  )
  const slotLinks = page.locator(`a[href^="/book/${tutor.id}?day="]`)
  await expect.poll(async () => slotLinks.count(), { timeout: 8_000 }).toBeGreaterThan(0)
})

test('Book a session CTA navigates to /book/:id', async ({ page }) => {
  const tutor = await pickTutor(page)
  await page.goto(APP_BASE + '/tutor/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('link', { name: /book a session/i })
    .first()
    .click()
  await page.waitForURL(/\/book\//, { timeout: 10_000 })
  expect(page.url()).toContain('/book/' + tutor.id)
})

test('See full schedule CTA also lands on /book/:id', async ({ page }) => {
  const tutor = await pickTutor(page)
  await page.goto(APP_BASE + '/tutor/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('link', { name: /see full schedule/i })
    .first()
    .click()
  await page.waitForURL(/\/book\//, { timeout: 10_000 })
})

test('subjects pills render the tutor.subjects array', async ({ page }) => {
  const tutor = await pickTutor(page)
  const detail = await getTutorDetail(page, tutor.id)
  const subjects = detail.subjects ?? []
  expect(subjects.length, 'the tutor under test lists subjects').toBeGreaterThan(0)
  await page.goto(APP_BASE + '/tutor/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const html = await page.content()
  for (const subject of subjects) expect(html).toContain(subject)
})

test('Verified badge is rendered for a verified tutor', async ({ page }) => {
  const tutor = await pickTutor(page)
  await page.goto(APP_BASE + '/tutor/' + tutor.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const html = await page.content()
  expect(html).toMatch(/verified/i)
})
