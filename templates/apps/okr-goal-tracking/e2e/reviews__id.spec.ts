/**
 * /reviews/:id — review detail (reflections, rating buttons, save/submit/delete).
 *
 * Each test creates a fresh signup, seeds a draft review via the UI on
 * /reviews, navigates to the detail, and exercises one element + asserts the
 * matching backend invariant via API read-after-write.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

async function startDraft(page: import('@playwright/test').Page): Promise<string> {
  await page.goto(APP_BASE + '/reviews')
  await page.getByTestId('reviews-create-draft').click()
  const card = page.getByTestId('reviews-list').locator('a').first()
  await expect(card).toBeVisible({ timeout: 10000 })
  await card.click()
  await page.waitForURL(/\/reviews\/[0-9a-f-]{36}$/, { timeout: 10000 })
  const url = new URL(page.url())
  return url.pathname.split('/').pop() as string
}

test.describe('/reviews/:id', () => {
  test('breadcrumb Reviews link navigates back to /reviews', async ({ page }) => {
    await signup(page)
    await startDraft(page)
    await page
      .getByRole('link', { name: /^reviews$/i })
      .first()
      .click()
    await page.waitForURL(/\/reviews$/, { timeout: 10000 })
  })

  test('summary textarea persists user input via PATCH', async ({ page }) => {
    const { accessToken } = await signup(page)
    const reviewId = await startDraft(page)
    await page.getByTestId('review-summary-input').fill('Quarterly notes — milestones met.')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('review-save').click()
      await expect(page.getByTestId('review-feedback')).toContainText(/saved/i, { timeout: 10000 })
    })
    const patched = reqs.find(
      (r) => r.method === 'PATCH' && new RegExp(`/api/reviews/${reviewId}`).test(r.url),
    )
    expect(patched, 'PATCH /api/reviews/:id should fire on save').toBeTruthy()
    expect(patched!.status).toBeLessThan(300)

    const fresh = await page.request.get(`${API_BASE}/reviews/${reviewId}`, {
      headers: apiHeaders(accessToken!),
    })
    const body = (await fresh.json()) as { summary: string }
    expect(body.summary).toContain('milestones met')
  })

  test('rating button 1 is wired (aria-pressed flips)', async ({ page }) => {
    await signup(page)
    await startDraft(page)
    await page.getByTestId('review-rating-1').click()
    await expect(page.getByTestId('review-rating-1')).toHaveAttribute('aria-pressed', 'true')
  })

  test('rating button 2 is wired', async ({ page }) => {
    await signup(page)
    await startDraft(page)
    await page.getByTestId('review-rating-2').click()
    await expect(page.getByTestId('review-rating-2')).toHaveAttribute('aria-pressed', 'true')
  })

  test('rating button 3 is wired', async ({ page }) => {
    await signup(page)
    await startDraft(page)
    await page.getByTestId('review-rating-3').click()
    await expect(page.getByTestId('review-rating-3')).toHaveAttribute('aria-pressed', 'true')
  })

  test('rating button 4 persists via PATCH and survives reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    const reviewId = await startDraft(page)
    await page.getByTestId('review-rating-4').click()
    await page.getByTestId('review-save').click()
    await expect(page.getByTestId('review-feedback')).toContainText(/saved/i, { timeout: 10000 })
    const fresh = await page.request.get(`${API_BASE}/reviews/${reviewId}`, {
      headers: apiHeaders(accessToken!),
    })
    const body = (await fresh.json()) as { rating: number }
    expect(body.rating).toBe(4)
    await page.reload()
    await expect(page.getByTestId('review-rating-4')).toHaveAttribute('aria-pressed', 'true')
  })

  test('rating button 5 is wired', async ({ page }) => {
    await signup(page)
    await startDraft(page)
    await page.getByTestId('review-rating-5').click()
    await expect(page.getByTestId('review-rating-5')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Save persists current draft (status remains draft, summary stored)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const reviewId = await startDraft(page)
    await page.getByTestId('review-summary-input').fill('Saved-but-not-submitted')
    await page.getByTestId('review-save').click()
    await expect(page.getByTestId('review-feedback')).toContainText(/saved/i, { timeout: 10000 })
    const fresh = await page.request.get(`${API_BASE}/reviews/${reviewId}`, {
      headers: apiHeaders(accessToken!),
    })
    const body = (await fresh.json()) as { status: string; summary: string }
    expect(body.status).toBe('draft')
    expect(body.summary).toBe('Saved-but-not-submitted')
  })

  test('Submit locks the review (status=completed, inputs disabled, persists)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const reviewId = await startDraft(page)
    await page.getByTestId('review-summary-input').fill('Final retrospective')
    await page.getByTestId('review-rating-3').click()
    await page.getByTestId('review-submit').click()
    await expect(page.getByTestId('review-feedback')).toContainText(/submitted/i, {
      timeout: 10000,
    })
    await expect(page.getByTestId('review-status')).toHaveText(/completed/i)
    await expect(page.getByTestId('review-summary-input')).toBeDisabled()
    const fresh = await page.request.get(`${API_BASE}/reviews/${reviewId}`, {
      headers: apiHeaders(accessToken!),
    })
    const body = (await fresh.json()) as { status: string; submitted_at: string | null }
    expect(body.status).toBe('completed')
    expect(body.submitted_at).not.toBeNull()
  })

  test('Delete removes the draft and returns to /reviews', async ({ page }) => {
    const { accessToken } = await signup(page)
    const reviewId = await startDraft(page)
    const deleteButton = page.locator('[data-mol-id="review-delete"]')
    const reqs = await captureNetwork(page, async () => {
      await deleteButton.click()
      // First click arms the two-step ConfirmButton; the confirm label must
      // be showing before the second click commits.
      await expect(deleteButton).toContainText(/delete this review draft\?/i)
      await deleteButton.click()
      await page.waitForURL(/\/reviews$/, { timeout: 10000 })
    })
    const deleted = reqs.find(
      (r) => r.method === 'DELETE' && new RegExp(`/api/reviews/${reviewId}`).test(r.url),
    )
    expect(deleted, 'DELETE /api/reviews/:id should fire').toBeTruthy()
    expect(deleted!.status).toBeLessThan(300)
    const gone = await page.request.get(`${API_BASE}/reviews/${reviewId}`, {
      headers: apiHeaders(accessToken!),
    })
    expect(gone.status()).toBe(404)
  })

  test('not-found id renders error fallback (no crash)', async ({ page }) => {
    await signup(page)
    // The unknown id's GET 404s — that IS the scenario under test.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 404',
    })
    await page.goto(APP_BASE + '/reviews/00000000-0000-0000-0000-000000000000')
    await expect(page.getByTestId('review-error')).toBeVisible({ timeout: 10000 })
  })
})
