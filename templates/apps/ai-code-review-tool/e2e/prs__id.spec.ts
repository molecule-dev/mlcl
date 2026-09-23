import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedReviewedPR, signup, whereUrl } from './_helpers.js'

test.describe('Pull request detail', () => {
  test('navigating to /prs/:id loads PR + reviews + comments via the API', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const { pr, review } = await seedReviewedPR(request, session.accessToken!)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/prs/' + pr.id)
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(whereUrl(reqs, new RegExp(`/api/pull-requests/${pr.id}`), 'GET').length).toBeGreaterThan(
      0,
    )
    expect(whereUrl(reqs, /\/api\/reviews\?pr_id=/, 'GET').length).toBeGreaterThan(0)
    expect(
      whereUrl(reqs, new RegExp(`/api/reviews/${review.id}/comments`), 'GET').length,
    ).toBeGreaterThan(0)
  })

  test('renders PR title and head/base ref + author', async ({ page, request }) => {
    const session = await signup(page)
    const { pr } = await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/prs/' + pr.id)
    await expect(page.getByRole('heading', { name: pr.title })).toBeVisible()
    await expect(page.getByText('feat/refactor-auth')).toBeVisible()
    await expect(page.getByText('octocat')).toBeVisible()
  })

  test('comment bodies are rendered (NOT empty placeholders)', async ({ page, request }) => {
    const session = await signup(page)
    await seedReviewedPR(request, session.accessToken!)
    const session2 =
      (await page
        .context()
        .request.get(APP_BASE)
        .catch(() => null),
      session) // eslint quiet
    void session2
    const session3 = await signup(page)
    const { pr } = await seedReviewedPR(request, session3.accessToken!)
    await page.goto(APP_BASE + '/prs/' + pr.id)
    const body = page.locator('[data-mol-id="review-comment-body"]').first()
    await expect(body).toBeVisible({ timeout: 10000 })
    await expect(body).toContainText(/token verification|extract this branch/i)
  })

  test('suggested patch displays inline when present', async ({ page, request }) => {
    const session = await signup(page)
    const { pr } = await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/prs/' + pr.id)
    await expect(page.locator('[data-mol-id="review-comment-patch"]').first()).toContainText(
      /return res\.status\(401\)/,
    )
  })

  test('breadcrumb links back to dashboard + history', async ({ page, request }) => {
    const session = await signup(page)
    const { pr } = await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/prs/' + pr.id)
    await page
      .getByRole('main')
      .getByRole('link', { name: /^dashboard$/i })
      .click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('non-existent PR id renders friendly unavailable message', async ({ page }) => {
    // The unknown PR 404s by design; the page must render the friendly copy.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 404',
    })
    await signup(page)
    await page.goto(APP_BASE + '/prs/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText(/this pull request is unavailable/i)).toBeVisible()
  })

  test('AuthGuard redirects anonymous users away from /prs/:id', async ({ page }) => {
    await page.goto(APP_BASE + '/prs/00000000-0000-0000-0000-000000000001')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('additions and deletions counts are rendered for a seeded PR', async ({ page, request }) => {
    const session = await signup(page)
    const { pr } = await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/prs/' + pr.id)
    // The seedReviewedPR helper sets additions=142, deletions=36.
    await expect(page.getByText(/142/).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/36/).first()).toBeVisible()
  })

  test('PR state badge renders ("open" for the seeded PR)', async ({ page, request }) => {
    const session = await signup(page)
    const { pr } = await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/prs/' + pr.id)
    await expect(page.getByText(/^open$/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('two seeded review comments are both rendered (not just the first)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const { pr } = await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/prs/' + pr.id)
    const bodies = page.locator('[data-mol-id="review-comment-body"]')
    await expect(bodies.first()).toBeVisible({ timeout: 10000 })
    expect(
      await bodies.count(),
      'expected the two seeded review comments to render',
    ).toBeGreaterThanOrEqual(2)
  })
})
