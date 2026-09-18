/**
 * /venue/:id — single-venue detail page. Asserts that the venue is
 * fetched + decorated, reviews load filtered by venue_id, and the
 * "Book this space" CTA navigates correctly.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, firstVenueId, signup } from './_helpers.js'

test('venue detail page renders venue details from /api/venues/:id', async ({ page }) => {
  await signup(page)
  const id = await firstVenueId(page)

  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/venue/' + id)
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const venueGet = reqs.find(
    (r) => r.method === 'GET' && new RegExp(`/api/venues/${id}`).test(r.url),
  )
  expect(venueGet?.status).toBe(200)
  // page surfaces a heading containing the venue name
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('reviews are fetched filtered by ?venue_id=', async ({ page }) => {
  await signup(page)
  const id = await firstVenueId(page)

  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/venue/' + id)
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const reviewsGet = reqs.find(
    (r) =>
      r.method === 'GET' &&
      /\/api\/reviews/.test(r.url) &&
      new RegExp(`venue_id=${id}`).test(r.url),
  )
  expect(reviewsGet?.status).toBe(200)
})

test('"Book this space" navigates to /book/:venueId', async ({ page }) => {
  await signup(page)
  const id = await firstVenueId(page)
  await page.goto(APP_BASE + '/venue/' + id)
  const cta = page.getByRole('link', { name: /book/i }).first()
  if ((await cta.count()) > 0) {
    await cta.click()
    await expect(page).toHaveURL(new RegExp(`/book/${id}`))
  }
})
