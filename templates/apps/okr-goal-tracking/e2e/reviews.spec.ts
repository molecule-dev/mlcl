import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, APP_BASE, captureNetwork } from './_helpers.js'

test.describe('Reviews flow', () => {
  test('Create-draft button POSTs to /api/reviews and shows the new card', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reviews')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('reviews-create-draft').click()
      await expect(page.getByTestId('reviews-list')).toBeVisible()
    })
    const created = reqs.find((r) => r.method === 'POST' && /\/api\/reviews\b/.test(r.url))
    expect(created, 'POST /api/reviews not observed').toBeTruthy()
    expect(created!.status).toBeLessThan(300)
  })

  test('starts a draft, edits + submits it, draft persists', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reviews')

    // Empty state visible at first.
    await expect(page.getByTestId('reviews-empty')).toBeVisible()

    // Start a draft.
    await page.getByTestId('reviews-create-draft').click()
    await expect(page.getByTestId('reviews-list')).toBeVisible()
    const card = page.getByTestId('reviews-list').locator('a').first()
    await card.click()

    await expect(page).toHaveURL(/\/reviews\//)
    await expect(page.getByTestId('review-detail')).toBeVisible()

    // Fill the summary + rating, save draft.
    await page.getByTestId('review-summary-input').fill('Q1 retro: shipped wizard, missed ARR.')
    await page.getByTestId('review-rating-4').click()
    await page.getByTestId('review-save').click()
    await expect(page.getByTestId('review-feedback')).toContainText(/saved/i)

    // Reload — saved values should persist.
    await page.reload()
    await expect(page.getByTestId('review-summary-input')).toHaveValue(/wizard, missed ARR/)
    await expect(page.getByTestId('review-rating-4')).toHaveAttribute('aria-pressed', 'true')

    // Submit the review (lock it).
    await page.getByTestId('review-submit').click()
    await expect(page.getByTestId('review-feedback')).toContainText(/submitted/i)
    await expect(page.getByTestId('review-status')).toHaveText(/completed/i)
    await expect(page.getByTestId('review-summary-input')).toBeDisabled()

    // Reload — locked state must persist.
    await page.reload()
    await expect(page.getByTestId('review-status')).toHaveText(/completed/i)
    await expect(page.getByTestId('review-summary-input')).toBeDisabled()
  })

  test('lists submitted reviews on the index page', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/reviews')
    // The create-draft handler fires GET /api/users/me then POST /api/reviews
    // asynchronously. If we navigate before the POST completes the request is
    // cancelled and the index reload returns an empty list. Wait for the POST
    // response before reloading.
    const postPromise = page.waitForResponse(
      (r) => /\/api\/reviews$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15000 },
    )
    await page.getByTestId('reviews-create-draft').click()
    const postResp = await postPromise
    expect(postResp.status(), 'POST /api/reviews failed').toBe(201)
    await page.goto(APP_BASE + '/reviews')
    const card = page.getByTestId('reviews-list').locator('a').first()
    await expect(card).toBeVisible()
    expect(email).toBeTruthy()
  })
})
