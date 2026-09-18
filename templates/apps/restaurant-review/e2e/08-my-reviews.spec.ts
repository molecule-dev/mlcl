/**
 * My Reviews — /my-reviews shows every review authored by the signed-in
 * user, hydrated with the restaurant name.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiRequest,
  captureNetwork,
  pickRestaurant,
  pickRestaurants,
  signup,
} from './_helpers.js'

test('My Reviews is empty for a brand-new account', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/my-reviews')
  await expect(page.locator('[data-testid="my-reviews-empty"]')).toBeVisible()
})

test('Reviews authored by this user show up on /my-reviews', async ({ page }) => {
  await signup(page)
  const [a, b] = await pickRestaurants(page, 2)

  await apiRequest(page, 'POST', '/api/reviews', {
    restaurant_id: a.id,
    rating: 5,
    body: 'Excellent. Best aglio e olio I have had outside of Italy proper.',
  })
  await apiRequest(page, 'POST', '/api/reviews', {
    restaurant_id: b.id,
    rating: 3,
    body: 'Decent but the bread basket arrived stale and the wait was long.',
  })

  await page.goto(APP_BASE + '/my-reviews')
  const list = page.locator('[data-testid="my-reviews-list"]')
  await expect(list).toBeVisible()
  await expect
    .poll(() => list.locator('[data-testid^="my-reviews-edit-"]').count(), { timeout: 8000 })
    .toBeGreaterThanOrEqual(2)
  await expect(list).toContainText(a.name)
  await expect(list).toContainText(b.name)
})

test('My-reviews mount fires GET /api/reviews?user_id and per-review restaurant lookups', async ({
  page,
}) => {
  await signup(page)
  const a = await pickRestaurant(page)
  await apiRequest(page, 'POST', '/api/reviews', {
    restaurant_id: a.id,
    rating: 5,
    body: 'Spec body for the GET reviews+restaurants captureNetwork pair.',
  })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/my-reviews')
    await page
      .locator('[data-testid="my-reviews-list"]')
      .waitFor({ state: 'visible', timeout: 10000 })
  })
  const reviewsCall = reqs.find(
    (r) => /\/api\/reviews\?[^]*user_id/.test(r.url) && r.method === 'GET',
  )
  const hydrateCall = reqs.find(
    (r) => new RegExp(`/api/restaurants/${a.id}`).test(r.url) && r.method === 'GET',
  )
  expect(reviewsCall, 'GET /api/reviews?user_id=:me must fire on mount').toBeTruthy()
  expect(hydrateCall, 'restaurant hydrate must fire for each review').toBeTruthy()
})

test('Total counter renders alongside the list when reviews exist', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page)
  await apiRequest(page, 'POST', '/api/reviews', {
    restaurant_id: target.id,
    rating: 4,
    body: 'Total counter spec — must show a number not the empty state.',
  })
  await page.goto(APP_BASE + '/my-reviews')
  await expect(page.locator('[data-testid="my-reviews-total"]')).toBeVisible({ timeout: 8000 })
})
