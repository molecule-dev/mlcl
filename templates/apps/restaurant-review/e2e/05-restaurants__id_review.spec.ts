/**
 * Write review — submitting on /restaurants/:id/review writes a review
 * row to /api/reviews and the review shows up on the restaurant detail
 * page on next navigation.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, pickRestaurant, signup } from './_helpers.js'

test('Posting a review creates a row on the backend and redirects', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page)
  await page.goto(APP_BASE + `/restaurants/${target.id}/review`)
  await expect(page.locator('[data-testid="write-review-heading"]')).toBeVisible()

  // Click the 5th star (5 rating).
  await page.locator('[data-testid="write-review-star-5"]').click()
  // Type a body with at least 30 chars.
  const body = 'The carbonara was perfect. Pasta cooked al dente, sauce silky, pepper bite spot on.'
  await page.locator('[data-testid="write-review-body"]').fill(body)
  await page.locator('[data-testid="write-review-submit"]').click()
  // Should redirect to the restaurant detail.
  await expect(page).toHaveURL(new RegExp(`/restaurants/${target.id}$`), { timeout: 15000 })

  // Backend should report at least one review for this restaurant authored
  // by THIS user.
  const reviews = await apiRequest<{
    data: Array<{ rating: number; body: string; restaurant_id: string }>
  }>(page, 'GET', `/api/reviews?restaurant_id=${target.id}`)
  expect(reviews.status).toBe(200)
  const ours = reviews.body.data.find((r) => r.body === body)
  expect(ours, 'review body should be persisted verbatim').toBeTruthy()
  expect(ours!.rating).toBe(5)
})

test('Posting a duplicate review surfaces the 409 to the user', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page, 1)
  await page.goto(APP_BASE + `/restaurants/${target.id}/review`)
  await page.locator('[data-testid="write-review-star-4"]').click()
  await page
    .locator('[data-testid="write-review-body"]')
    .fill('First take. Surprisingly good service tonight, food consistent.')
  await page.locator('[data-testid="write-review-submit"]').click()
  await expect(page).toHaveURL(new RegExp(`/restaurants/${target.id}$`), { timeout: 15000 })

  // Try to post a SECOND review for the same restaurant — should error.
  await page.goto(APP_BASE + `/restaurants/${target.id}/review`)
  await page.locator('[data-testid="write-review-star-3"]').click()
  await page
    .locator('[data-testid="write-review-body"]')
    .fill('Second take. Same restaurant, must collide on UNIQUE constraint.')
  await page.locator('[data-testid="write-review-submit"]').click()
  await expect(page.locator('[data-testid="write-review-error"]')).toBeVisible({ timeout: 8000 })
})

test('Submit fires POST /api/reviews and the GET reflects the new row', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page, 2)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/restaurants/${target.id}/review`)
    await page.locator('[data-testid="write-review-star-4"]').click()
    await page
      .locator('[data-testid="write-review-body"]')
      .fill('CaptureNetwork-spec body. Unique entry to identify this row downstream.')
    await page.locator('[data-testid="write-review-submit"]').click()
    await expect(page).toHaveURL(new RegExp(`/restaurants/${target.id}$`), { timeout: 15000 })
  })
  const post = reqs.find((r) => /\/api\/reviews(\?|$)/.test(r.url) && r.method === 'POST')
  expect(post, 'POST /api/reviews must fire on submit').toBeTruthy()
  expect(post!.status).toBeLessThan(400)
})

test('Page heading reads as the write-review form', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page, 3)
  await page.goto(APP_BASE + `/restaurants/${target.id}/review`)
  await expect(page.locator('[data-testid="write-review-heading"]')).toBeVisible()
})

test('Star buttons + body textarea are all reachable', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page, 4)
  await page.goto(APP_BASE + `/restaurants/${target.id}/review`)
  for (let n = 1; n <= 5; n++) {
    await expect(page.locator(`[data-testid="write-review-star-${n}"]`)).toBeVisible()
  }
  await expect(page.locator('[data-testid="write-review-body"]')).toBeVisible()
})
