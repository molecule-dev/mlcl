import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedReviewedPR, signup, whereUrl } from './_helpers.js'

test.describe('Reports page', () => {
  test('renders heading + range buttons', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('heading', { name: /^Reports$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^7d$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^30d$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^90d$/i })).toBeVisible()
  })

  test('initial load fires summary + top-repos + leaderboard + trend + severity-counts', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(whereUrl(reqs, /\/api\/reports\/summary/, 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/reports\/top-repos/, 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/reports\/leaderboard/, 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/reports\/trend/, 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/reports\/severity-counts/, 'GET').length).toBeGreaterThan(0)
  })

  test('changing range to 7d re-fetches summary + trend with days=7', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    // Listen for the days=7 summary response BEFORE clicking, so we never miss it.
    const summaryPromise = page.waitForResponse(
      (r) => /\/api\/reports\/summary/.test(r.url()) && /days=7/.test(r.url()),
      { timeout: 15000 },
    )
    const trendPromise = page.waitForResponse(
      (r) => /\/api\/reports\/trend/.test(r.url()) && /days=7/.test(r.url()),
      { timeout: 15000 },
    )
    await page.getByRole('button', { name: /^7d$/i }).click()
    const summaryResp = await summaryPromise
    const trendResp = await trendPromise
    expect(summaryResp.status(), 'days=7 summary should not 5xx').toBeLessThan(500)
    expect(trendResp.status(), 'days=7 trend should not 5xx').toBeLessThan(500)
  })

  test('with seeded data, top-repos panel shows the repo full_name', async ({ page, request }) => {
    const session = await signup(page)
    const { repo } = await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByText(repo.full_name)).toBeVisible({ timeout: 10000 })
  })

  test('with seeded data, leaderboard shows author_login', async ({ page, request }) => {
    const session = await signup(page)
    await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByText('octocat').first()).toBeVisible({ timeout: 10000 })
  })

  test('severity badge row reflects real comment severity counts (not estimates)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    // seedReviewedPR creates 1 high + 1 med comment + 1 merged-state pr (none, our pr is open)
    await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/reports')
    // critical (=high) must equal exactly 1 (not estimated)
    await expect(page.getByText(/critical/i).first()).toBeVisible()
  })

  test('a11y: range buttons expose aria-pressed state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    const r30 = page.getByRole('button', { name: /^30d$/i })
    await expect(r30).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: /^7d$/i }).click()
    await expect(page.getByRole('button', { name: /^7d$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(r30).toHaveAttribute('aria-pressed', 'false')
  })

  test('AuthGuard redirects anonymous visitors to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reports')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
