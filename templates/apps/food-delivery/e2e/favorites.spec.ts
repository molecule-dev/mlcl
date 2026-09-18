import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, pickRestaurant, signup, uniqueEmail } from './_helpers.js'

/**
 * Favorites flow.
 *
 * Invariants verified:
 * - Heart toggle on /restaurant/:id POSTs /api/favorites and the favorite
 *   appears in GET /api/favorites (read-after-write).
 * - Reload on the same restaurant reflects the persisted favorite state
 *   (button shows aria-pressed=true and label "Favorited").
 * - /favorites page shows the saved restaurant.
 * - Removing from /favorites DELETEs and the favorite is gone on next GET.
 * - Toggling off via the heart on /restaurant/:id removes the favorite too.
 */

test.describe('favorites', () => {
  test('add-to-favorites from menu page persists and shows on /favorites', async ({ page }) => {
    await signup(page, uniqueEmail('fd-fav-add'))
    // Whichever restaurant the catalog holds — the demo rows get replaced.
    const restaurant = await pickRestaurant(page)
    await page.goto(APP_BASE + '/restaurants')
    await page.getByRole('heading', { name: restaurant.name }).first().click()
    await expect(page).toHaveURL(/\/restaurant\/[0-9a-f-]+/)

    const toggle = page.getByTestId('restaurant-favorite-toggle')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')

    const postPromise = page.waitForResponse(
      (r) => /\/api\/favorites$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await toggle.click()
    const postResp = await postPromise
    expect(postResp.status()).toBe(201)

    await expect(toggle).toHaveAttribute('aria-pressed', 'true')

    // Reload — persisted state must show favorited.
    await page.reload()
    await expect(page.getByTestId('restaurant-favorite-toggle')).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    // Read-after-write: GET /favorites contains it.
    const resp = await page.request.get(API_BASE + '/favorites')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    const restaurants = body?.data?.restaurants ?? []
    expect(restaurants.length).toBe(1)
    expect(restaurants[0].restaurant.name).toBe(restaurant.name)

    // /favorites page renders the row.
    await page.goto(APP_BASE + '/favorites')
    await expect(page.getByTestId('favorites-list')).toBeVisible()
    await expect(page.getByTestId('favorite-row').first()).toContainText(restaurant.name)
  })

  test('removing favorite from /favorites page deletes the row', async ({ page }) => {
    await signup(page, uniqueEmail('fd-fav-remove'))
    const restaurant = await pickRestaurant(page)
    await page.goto(APP_BASE + '/restaurants')
    await page.getByRole('heading', { name: restaurant.name }).first().click()
    const postPromise = page.waitForResponse(
      (r) => /\/api\/favorites$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await page.getByTestId('restaurant-favorite-toggle').click()
    await postPromise

    await page.goto(APP_BASE + '/favorites')
    await expect(page.getByTestId('favorite-row')).toHaveCount(1)
    const delPromise = page.waitForResponse(
      (r) => /\/api\/favorites\/[\w-]+/.test(r.url()) && r.request().method() === 'DELETE',
      { timeout: 10_000 },
    )
    await page.getByTestId('favorite-remove').click()
    await delPromise

    // Empty state.
    await expect(page.getByTestId('favorites-empty')).toBeVisible()

    // Read-after-write: GET shows no favorites.
    const resp = await page.request.get(API_BASE + '/favorites')
    const body = await resp.json()
    expect(body?.data?.restaurants ?? []).toHaveLength(0)
  })

  test('un-favoriting via the heart toggle on the restaurant page also removes the row', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('fd-fav-untoggle'))
    const restaurant = await pickRestaurant(page)
    await page.goto(APP_BASE + '/restaurants')
    await page.getByRole('heading', { name: restaurant.name }).first().click()
    const toggle = page.getByTestId('restaurant-favorite-toggle')
    const postPromise = page.waitForResponse(
      (r) => /\/api\/favorites$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await toggle.click()
    await postPromise
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')

    const delPromise = page.waitForResponse(
      (r) => /\/api\/favorites\/[\w-]+/.test(r.url()) && r.request().method() === 'DELETE',
      { timeout: 10_000 },
    )
    await toggle.click()
    await delPromise
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')

    const resp = await page.request.get(API_BASE + '/favorites')
    const body = await resp.json()
    expect(body?.data?.restaurants ?? []).toHaveLength(0)
  })
})
