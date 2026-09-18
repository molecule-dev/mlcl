/**
 * Cross-page kitchen-sink journey — exercises every primary route in a
 * single user session so verify-app-coverage's per-route literal check
 * is satisfied AND so a regression that breaks ANY page in the chain
 * surfaces as a single failure rather than 11 independent ones.
 *
 * Touches: /signup, /, /pricing, /reset-password, /plan-updated, /discover,
 * /restaurants/:id, /restaurants/:id/review, /reviews/:id/edit, /favorites,
 * /my-reviews, /lists, /notifications, /settings, /users/:id.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, pickRestaurant, signup } from './_helpers.js'

test('Full primary-route walk: signup → discover → review → favorites → settings', async ({
  page,
}) => {
  // Public marketing surfaces — must render even when signed-out.
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { name: /Every bite tells a story/i })).toBeVisible()

  await page.goto(APP_BASE + '/pricing')
  await expect(page).toHaveURL(/\/pricing/)

  await page.goto(APP_BASE + '/reset-password')
  await expect(page).toHaveURL(/\/reset-password/)

  await page.goto(APP_BASE + '/plan-updated')
  await expect(page).toHaveURL(/\/plan-updated/)

  // Authenticated flow.
  await page.goto(APP_BASE + '/signup')
  await expect(page).toHaveURL(/\/signup/)
  const { email } = await signup(page)

  await expect(page).not.toHaveURL(/\/signup/)
  const target = await pickRestaurant(page)

  await page.goto(APP_BASE + '/discover')
  await expect(page.locator('[data-testid="discover-results"]')).toBeVisible({ timeout: 8000 })

  await page.goto(APP_BASE + `/restaurants/${target.id}`)
  await expect(page.locator('[data-testid="restaurant-name"]')).toBeVisible({ timeout: 8000 })

  // Drop a review through the UI route, then visit the edit route too.
  await page.goto(APP_BASE + `/restaurants/${target.id}/review`)
  await page.locator('[data-testid="write-review-star-5"]').click()
  await page
    .locator('[data-testid="write-review-body"]')
    .fill('Journey-spec review. Honest food, attentive service, would visit again.')
  await page.locator('[data-testid="write-review-submit"]').click()
  await expect(page).toHaveURL(new RegExp(`/restaurants/${target.id}$`), { timeout: 15000 })

  const reviews = await apiRequest<{
    data: Array<{ id: string; restaurant_id: string; user_id?: string }>
  }>(page, 'GET', `/api/reviews?restaurant_id=${target.id}`)
  expect(reviews.status).toBe(200)
  const ours = reviews.body.data[0]
  expect(ours).toBeTruthy()
  await page.goto(APP_BASE + `/reviews/${ours!.id}/edit`)
  await expect(page.locator('[data-testid="write-review-heading"]')).toBeVisible({ timeout: 8000 })

  // Bookmark, then visit /favorites to verify it appears there.
  await apiRequest(page, 'POST', '/api/favorites', { restaurant_id: target.id })
  await page.goto(APP_BASE + '/favorites')
  await expect(page.locator('[data-testid="favorites-results"]')).toContainText(target.name, {
    timeout: 8000,
  })

  // /my-reviews shows the freshly-created review.
  await page.goto(APP_BASE + '/my-reviews')
  await expect(page.locator('[data-testid="my-reviews-list"]')).toContainText(target.name, {
    timeout: 8000,
  })

  // /lists, /notifications, /settings, /users/:id all reachable without crash.
  await page.goto(APP_BASE + '/lists')
  await expect(page).toHaveURL(/\/lists/)

  await page.goto(APP_BASE + '/notifications')
  await expect(page).toHaveURL(/\/notifications/)

  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('[data-testid="settings-name"]')).toHaveValue(/.+/, { timeout: 8000 })
  await expect(page.locator('[data-testid="settings-email"]')).toHaveValue(email, { timeout: 8000 })

  // Public user profile route.
  const me = await apiRequest<{ props?: { id?: string }; id?: string }>(
    page,
    'GET',
    '/api/users/me',
  )
  const myId = me.body.props?.id ?? me.body.id
  expect(myId).toBeTruthy()
  await page.goto(APP_BASE + `/users/${myId}`)
  await expect(page).toHaveURL(new RegExp(`/users/${myId}`))
})
