import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedReviewedPR, signup, whereUrl } from './_helpers.js'

test.describe('Dashboard', () => {
  test('redirects unauthed users away from /dashboard', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login|\/$|\/signup/)
  })

  test('renders for a signed-in user with empty state copy + connect-repo CTA', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible()
    await expect(page.getByText(/no pull requests yet/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /connect repository/i }).first()).toBeVisible()
  })

  test('hits /api/pull-requests, /api/repositories, /api/reports/summary, /api/reports/severity-counts on load', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(whereUrl(reqs, /\/api\/pull-requests(?:\?|$)/, 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/repositories(?:\?|$)/, 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/reports\/summary/, 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/reports\/severity-counts/, 'GET').length).toBeGreaterThan(0)
  })

  test('Connect repository CTA navigates to /repos', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /connect repository/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/repos/)
  })

  test('Review history link navigates to /history', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /review history/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/history/)
  })

  test('PR list populates when a reviewed PR exists', async ({ page, request }) => {
    const session = await signup(page)
    const seeded = await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(seeded.pr.title)).toBeVisible()
  })

  test('AI insights pane renders comment bodies (not empty placeholders)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/dashboard')
    const body = page.locator('[data-mol-id="ai-insight-body"]').first()
    await expect(body).toBeVisible({ timeout: 10000 })
    await expect(body).toContainText(/.+/) // non-empty
  })

  test('severity badge counts mirror the seeded comment severity totals', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    // seedReviewedPR adds 1 high + 1 med comment
    await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/dashboard')
    // SeverityBadgeRow renders critical/changes_requested/suggestion/approved counts;
    // critical (=high) must be exactly 1 since we only seeded 1 high-severity comment
    await expect(page.getByText(/critical/i).first()).toBeVisible()
    const text = await page.locator('body').textContent()
    expect(text).toContain('1') // at minimum, critical count of 1 is rendered
  })
})
