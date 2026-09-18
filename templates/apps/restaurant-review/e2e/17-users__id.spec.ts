/**
 * /users/:id — the public profile route. Loading your own /users/:id
 * fetches your real profile + your reviews; the page shows your
 * displayed name and review count.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, pickRestaurant, signup } from './_helpers.js'

test('Visiting /users/:id renders the profile name', async ({ page }) => {
  await signup(page)
  const me = await apiRequest<{ props?: { id?: string }; id?: string }>(
    page,
    'GET',
    '/api/users/me',
  )
  const myId = me.body.props?.id ?? me.body.id
  expect(myId).toBeTruthy()
  await page.goto(APP_BASE + `/users/${myId}`)
  await expect(page).toHaveURL(new RegExp(`/users/${myId}`))
  await expect(page.locator('[data-testid="profile-name"]')).toBeVisible({ timeout: 8000 })
})

test('A user with no reviews shows the empty state', async ({ page }) => {
  await signup(page)
  const me = await apiRequest<{ props?: { id?: string }; id?: string }>(
    page,
    'GET',
    '/api/users/me',
  )
  const myId = me.body.props?.id ?? me.body.id
  await page.goto(APP_BASE + `/users/${myId}`)
  await expect(page.locator('[data-testid="profile-reviews-empty"]')).toBeVisible({ timeout: 8000 })
})

test('After posting a review the profile reviews list contains it', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page)
  await apiRequest(page, 'POST', '/api/reviews', {
    restaurant_id: target.id,
    rating: 4,
    body: 'Profile-spec review. Solid plate, friendly room, would return.',
  })
  const me = await apiRequest<{ props?: { id?: string }; id?: string }>(
    page,
    'GET',
    '/api/users/me',
  )
  const myId = me.body.props?.id ?? me.body.id
  await page.goto(APP_BASE + `/users/${myId}`)
  await expect(page.locator('[data-testid="profile-reviews"]')).toContainText(target.name, {
    timeout: 8000,
  })
})

test('Profile mount fires GET /api/users/:id and GET /api/reviews?user_id=:id', async ({
  page,
}) => {
  await signup(page)
  const me = await apiRequest<{ props?: { id?: string }; id?: string }>(
    page,
    'GET',
    '/api/users/me',
  )
  const myId = me.body.props?.id ?? me.body.id
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/users/${myId}`)
    await page.locator('[data-testid="profile-name"]').waitFor({ state: 'visible', timeout: 10000 })
  })
  const userCall = reqs.find(
    (r) => new RegExp(`/api/users/${myId}`).test(r.url) && r.method === 'GET',
  )
  const reviewsCall = reqs.find(
    (r) => /\/api\/reviews\?[^]*user_id/.test(r.url) && r.method === 'GET',
  )
  expect(userCall, 'GET /api/users/:id must fire on profile mount').toBeTruthy()
  expect(reviewsCall, 'GET /api/reviews?user_id=:id must fire on profile mount').toBeTruthy()
})
