/**
 * Favorites — page renders only the user's bookmarks (joined to the
 * restaurant catalog), and removing one shrinks the list.
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

test('Favorites page is empty for a new user', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/favorites')
  await expect(page.locator('[data-testid="favorites-empty"]')).toBeVisible()
})

test('Favorites page lists every restaurant the user bookmarked', async ({ page }) => {
  await signup(page)
  const [a, b] = await pickRestaurants(page, 2)

  // Bookmark two via the API.
  await apiRequest(page, 'POST', '/api/favorites', { restaurant_id: a.id })
  await apiRequest(page, 'POST', '/api/favorites', { restaurant_id: b.id })

  await page.goto(APP_BASE + '/favorites')
  const grid = page.locator('[data-testid="favorites-results"]')
  await expect(grid).toBeVisible()
  await expect.poll(() => grid.locator('a').count()).toBe(2)
  await expect(grid).toContainText(a.name)
  await expect(grid).toContainText(b.name)
})

test('Removing a favorite from the Favorites page shrinks the list', async ({ page }) => {
  await signup(page)
  const [a, b] = await pickRestaurants(page, 2)
  await apiRequest(page, 'POST', '/api/favorites', { restaurant_id: a.id })
  await apiRequest(page, 'POST', '/api/favorites', { restaurant_id: b.id })

  await page.goto(APP_BASE + '/favorites')
  const grid = page.locator('[data-testid="favorites-results"]')
  await expect.poll(() => grid.locator('a').count()).toBe(2)

  // Click the heart on the first card to unfavorite it.
  await grid.locator('a').first().locator('button[aria-label="Save restaurant"]').click()
  await expect
    .poll(
      async () => {
        const r = await apiRequest<{ total: number }>(page, 'GET', '/api/favorites')
        return r.body.total
      },
      { timeout: 8000 },
    )
    .toBe(1)
})

test('Favorites page mount fires GET /api/favorites and per-favorite restaurant lookups', async ({
  page,
}) => {
  await signup(page)
  const a = await pickRestaurant(page)
  await apiRequest(page, 'POST', '/api/favorites', { restaurant_id: a.id })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/favorites')
    await page
      .locator('[data-testid="favorites-results"]')
      .waitFor({ state: 'visible', timeout: 10000 })
  })
  const favCall = reqs.find((r) => /\/api\/favorites(\?|$)/.test(r.url) && r.method === 'GET')
  const restCall = reqs.find(
    (r) => new RegExp(`/api/restaurants/${a.id}`).test(r.url) && r.method === 'GET',
  )
  expect(favCall, 'GET /api/favorites must fire on mount').toBeTruthy()
  expect(restCall, 'GET /api/restaurants/:id hydrate must fire').toBeTruthy()
})
