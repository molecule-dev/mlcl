/**
 * Landing page renders the marketing pitch and pulls live data from the API
 * (preview restaurants and featured reviews) — no hardcoded fixture data.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('Landing renders marketing copy + at least one live restaurant card', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { name: /Every bite tells a story/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Tables worth a detour/i })).toBeVisible()

  // Wait for the live preview rail to populate from /api/restaurants.
  const preview = page.locator('[data-testid="landing-preview-restaurants"]')
  await expect(preview).toBeVisible()
  await expect.poll(() => preview.locator('a').count()).toBeGreaterThan(0)
})

test('Landing exposes signup + signin entry points', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: /Join Morsel/i }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /Sign in/i }).first()).toBeVisible()
})

test('Featured reviews rail renders below the preview rail', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.locator('[data-testid="landing-featured-reviews"]')).toBeVisible({
    timeout: 10000,
  })
})

test('Hero issues GET /api/restaurants and GET /api/reviews on mount', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/')
    await page
      .locator('[data-testid="landing-preview-restaurants"]')
      .waitFor({ state: 'visible', timeout: 10000 })
  })
  const restaurantCall = reqs.find(
    (r) => /\/api\/restaurants(\?|$)/.test(r.url) && r.method === 'GET',
  )
  const reviewsCall = reqs.find((r) => /\/api\/reviews(\?|$)/.test(r.url) && r.method === 'GET')
  expect(restaurantCall, 'GET /api/restaurants must fire on mount').toBeTruthy()
  expect(restaurantCall!.status).toBeLessThan(400)
  expect(reviewsCall, 'GET /api/reviews must fire on mount').toBeTruthy()
  expect(reviewsCall!.status).toBeLessThan(400)
})

test('Hero search inputs and combobox are visible', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByPlaceholder(/Pizza, ramen/i)).toBeVisible()
  await expect(page.getByPlaceholder(/Neighborhood, city/i)).toBeVisible()
  await expect(page.getByRole('combobox', { name: /Price level/i })).toBeVisible()
})
