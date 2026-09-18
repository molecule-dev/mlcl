/**
 * Restaurant detail — name, menu, reviews, and Save button all wire to
 * the live API.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiRequest,
  captureNetwork,
  pickRestaurant,
  pickRestaurantWithMenu,
  signup,
} from './_helpers.js'

test('Restaurant detail renders name + menu items + at least one section', async ({ page }) => {
  await signup(page)
  // The "Menu highlights" section only renders for a restaurant that has menu
  // items, so pick one the live catalog says does rather than assuming the
  // demo seed's first row still exists.
  const target = await pickRestaurantWithMenu(page)
  await page.goto(APP_BASE + `/restaurants/${target.id}`)

  await expect(page.locator('[data-testid="restaurant-name"]')).toHaveText(target.name)
  await expect(page.getByRole('heading', { name: /Menu highlights/i })).toBeVisible()
})

test('Save toggle on restaurant detail writes to /api/favorites', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page)
  await page.goto(APP_BASE + `/restaurants/${target.id}`)
  const saveBtn = page.locator('[data-testid="restaurant-favorite"]')
  await expect(saveBtn).toBeVisible()

  await saveBtn.click()
  await expect
    .poll(
      async () => {
        const r = await apiRequest<{ data: { restaurant_id: string }[] }>(
          page,
          'GET',
          '/api/favorites',
        )
        return r.body.data.some((f) => f.restaurant_id === target.id)
      },
      { timeout: 8000 },
    )
    .toBeTruthy()

  // Button label should flip to "Saved".
  await expect(saveBtn).toHaveAttribute('aria-pressed', 'true')

  // Toggling again removes the favorite row.
  await saveBtn.click()
  await expect
    .poll(
      async () => {
        const r = await apiRequest<{ data: { restaurant_id: string }[] }>(
          page,
          'GET',
          '/api/favorites',
        )
        return r.body.data.some((f) => f.restaurant_id === target.id)
      },
      { timeout: 8000 },
    )
    .toBeFalsy()
})

test('Write review CTA on detail navigates to /restaurants/:id/review', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page)
  await page.goto(APP_BASE + `/restaurants/${target.id}`)
  await page.locator('[data-testid="restaurant-write-review"]').click()
  await expect(page).toHaveURL(/\/restaurants\/[^/]+\/review$/)
  await expect(page.locator('[data-testid="write-review-heading"]')).toBeVisible()
})

test('Detail mount fires GET /api/restaurants/:id, /menu, and /reviews', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/restaurants/${target.id}`)
    await page
      .locator('[data-testid="restaurant-name"]')
      .waitFor({ state: 'visible', timeout: 10000 })
  })
  const detailCall = reqs.find(
    (r) => new RegExp(`/api/restaurants/${target.id}$`).test(r.url) && r.method === 'GET',
  )
  const menuCall = reqs.find(
    (r) => new RegExp(`/api/restaurants/${target.id}/menu`).test(r.url) && r.method === 'GET',
  )
  const reviewsCall = reqs.find(
    (r) => /\/api\/reviews\?/.test(r.url) && r.url.includes(target.id) && r.method === 'GET',
  )
  expect(detailCall).toBeTruthy()
  expect(detailCall!.status).toBe(200)
  expect(menuCall, 'GET /api/restaurants/:id/menu must fire').toBeTruthy()
  expect(reviewsCall, 'GET /api/reviews?restaurant_id=:id must fire').toBeTruthy()
})

test('Reviews container is rendered on the detail page', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page)
  await page.goto(APP_BASE + `/restaurants/${target.id}`)
  // restaurant-reviews container always renders; presence is the contract.
  await expect(page.locator('[data-testid="restaurant-reviews"]')).toHaveCount(1)
})
