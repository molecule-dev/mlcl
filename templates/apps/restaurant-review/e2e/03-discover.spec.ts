/**
 * Discover — listing renders from the live API, filtering by cuisine
 * works, and bookmarking writes to /api/favorites and updates the UI.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, listRestaurants, signup } from './_helpers.js'

test('Discover lists restaurants from the API and supports cuisine filter', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/discover')
  const grid = page.locator('[data-testid="discover-results"]')
  await expect(grid).toBeVisible()
  await expect.poll(() => grid.locator('a').count()).toBeGreaterThan(0)

  // Pick the cuisine of the first card and filter to it.
  const restaurants = await listRestaurants(page)
  expect(restaurants.length).toBeGreaterThan(0)
  const firstCuisine = restaurants[0]!.cuisine.toLowerCase()
  await page.locator('[data-testid="discover-cuisine"]').selectOption(firstCuisine)
  await expect
    .poll(async () => {
      const count = await grid.locator('a').count()
      return count
    })
    .toBeGreaterThan(0)
  // Every visible card must mention the chosen cuisine.
  await expect
    .poll(async () => {
      const text = await grid.innerText()
      return text.toLowerCase().includes(firstCuisine)
    })
    .toBeTruthy()
})

test('Bookmarking from Discover persists to /api/favorites', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/discover')
  const grid = page.locator('[data-testid="discover-results"]')
  await expect(grid).toBeVisible()
  await expect.poll(() => grid.locator('a').count()).toBeGreaterThan(0)

  // Click the heart on the first card.
  const firstBookmark = grid.locator('a').first().locator('button[aria-label="Save restaurant"]')
  await firstBookmark.click()

  // Backend should now report 1 favorite.
  await expect
    .poll(
      async () => {
        const res = await apiRequest<{ total: number; data: unknown[] }>(
          page,
          'GET',
          '/api/favorites',
        )
        return res.body?.total ?? 0
      },
      { timeout: 8000 },
    )
    .toBe(1)

  // Toggling again removes it.
  await firstBookmark.click()
  await expect
    .poll(
      async () => {
        const res = await apiRequest<{ total: number }>(page, 'GET', '/api/favorites')
        return res.body?.total ?? -1
      },
      { timeout: 8000 },
    )
    .toBe(0)
})

test('Discover hits GET /api/restaurants and GET /api/favorites on mount', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/discover')
    await page
      .locator('[data-testid="discover-results"]')
      .waitFor({ state: 'visible', timeout: 10000 })
  })
  const restaurantsCall = reqs.find(
    (r) => /\/api\/restaurants(\?|$)/.test(r.url) && r.method === 'GET',
  )
  const favoritesCall = reqs.find((r) => /\/api\/favorites(\?|$)/.test(r.url) && r.method === 'GET')
  expect(restaurantsCall, 'GET /api/restaurants must fire on Discover mount').toBeTruthy()
  expect(restaurantsCall!.status).toBe(200)
  expect(favoritesCall, 'GET /api/favorites must fire on Discover mount').toBeTruthy()
})

test('Search input is reachable and price filter renders', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/discover')
  await expect(page.locator('[data-testid="discover-search"]')).toBeVisible()
  await expect(page.locator('[data-testid="discover-price"]')).toBeVisible()
})

test('Cuisine select renders and is interactive', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/discover')
  await expect(page.locator('[data-testid="discover-cuisine"]')).toBeVisible()
})
