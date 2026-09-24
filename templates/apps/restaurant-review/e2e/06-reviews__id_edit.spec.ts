/**
 * Edit / delete review — /reviews/:id/edit pre-fills the form from the
 * stored row, PUT /api/reviews/:id persists the edit, and the delete
 * button removes the row.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, pickRestaurant, signup } from './_helpers.js'

test('Editing a review updates the body on the server', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page, 2)

  // Seed a review via the API so the test is independent of UI flake.
  const created = await apiRequest<{ id: string }>(page, 'POST', '/api/reviews', {
    restaurant_id: target.id,
    rating: 4,
    body: 'Initial body. Good food, decent service, would visit again next month.',
  })
  expect(created.status).toBe(201)
  const reviewId = created.body.id

  await page.goto(APP_BASE + `/reviews/${reviewId}/edit`)
  await expect(page.locator('[data-testid="write-review-heading"]')).toBeVisible()

  // Change the body.
  const newBody = 'Updated body. The cacio e pepe is on a different level.'
  await page.locator('[data-testid="write-review-body"]').fill(newBody)
  await page.locator('[data-testid="write-review-submit"]').click()
  await expect(page).toHaveURL(new RegExp(`/restaurants/${target.id}$`), { timeout: 15000 })

  // Verify on the server.
  const fetched = await apiRequest<{ body: string }>(page, 'GET', `/api/reviews/${reviewId}`)
  expect(fetched.status).toBe(200)
  expect(fetched.body.body).toBe(newBody)
})

test('Deleting a review removes the row from the database', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page, 3)

  const created = await apiRequest<{ id: string }>(page, 'POST', '/api/reviews', {
    restaurant_id: target.id,
    rating: 3,
    body: 'About to delete this — should not be in the DB after the test.',
  })
  expect(created.status).toBe(201)
  const reviewId = created.body.id

  await page.goto(APP_BASE + `/reviews/${reviewId}/edit`)
  // ConfirmButton arms on the first click (no native dialog), then commits
  // on the confirming click.
  const del = page.locator('[data-testid="write-review-delete"]')
  await del.click()
  await expect(del).toHaveText('Delete this review? This cannot be undone.')
  await del.click()

  await expect
    .poll(
      async () => {
        const fetched = await apiRequest<unknown>(page, 'GET', `/api/reviews/${reviewId}`)
        return fetched.status
      },
      { timeout: 8000 },
    )
    .toBe(404)
})

test('Edit page mount fires GET /api/reviews/:id and submit fires PUT', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page, 4)
  const created = await apiRequest<{ id: string }>(page, 'POST', '/api/reviews', {
    restaurant_id: target.id,
    rating: 5,
    body: 'CaptureNetwork-edit body for the gate-12 trace.',
  })
  expect(created.status).toBe(201)
  const reviewId = created.body.id
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/reviews/${reviewId}/edit`)
    await expect(page.locator('[data-testid="write-review-heading"]')).toBeVisible()
    await page
      .locator('[data-testid="write-review-body"]')
      .fill('Edited via captureNetwork — second body.')
    await page.locator('[data-testid="write-review-submit"]').click()
    await expect(page).toHaveURL(new RegExp(`/restaurants/${target.id}$`), { timeout: 15000 })
  })
  const getCall = reqs.find(
    (r) => new RegExp(`/api/reviews/${reviewId}$`).test(r.url) && r.method === 'GET',
  )
  const putCall = reqs.find(
    (r) => new RegExp(`/api/reviews/${reviewId}$`).test(r.url) && r.method === 'PUT',
  )
  expect(getCall, 'GET /api/reviews/:id must fire on edit mount').toBeTruthy()
  expect(putCall, 'PUT /api/reviews/:id must fire on submit').toBeTruthy()
  expect(putCall!.status).toBeLessThan(400)
})

test('Edit form heading + delete button are reachable', async ({ page }) => {
  await signup(page)
  const target = await pickRestaurant(page, 5)
  const created = await apiRequest<{ id: string }>(page, 'POST', '/api/reviews', {
    restaurant_id: target.id,
    rating: 3,
    body: 'Headings/buttons spec body — should render the form chrome.',
  })
  expect(created.status).toBe(201)
  await page.goto(APP_BASE + `/reviews/${created.body.id}/edit`)
  await expect(page.locator('[data-testid="write-review-heading"]')).toBeVisible()
  await expect(page.locator('[data-testid="write-review-delete"]')).toBeVisible()
})
