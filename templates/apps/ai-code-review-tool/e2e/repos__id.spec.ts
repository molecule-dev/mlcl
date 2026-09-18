import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedReviewedPR, signup, whereUrl } from './_helpers.js'

test.describe('Repository detail page (/repos/:id)', () => {
  test('AuthGuard redirects anonymous visitors away from /repos/:id', async ({ page }) => {
    await page.goto(APP_BASE + '/repos/00000000-0000-0000-0000-000000000000')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('initial load fetches /api/repositories/<id>, /api/pull-requests?repository_id=<id>, and /api/reviews', async ({
    page,
    request,
  }) => {
    const u = await signup(page)
    const seeded = await seedReviewedPR(request, u.accessToken!, {
      repoName: `refract/repos-id-${Date.now()}`,
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/repos/' + seeded.repo.id)
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const repoGet = whereUrl(reqs, new RegExp(`/api/repositories/${seeded.repo.id}`), 'GET')
    const prGet = whereUrl(
      reqs,
      new RegExp(`/api/pull-requests\\?repository_id=${seeded.repo.id}`),
      'GET',
    )
    const reviewGet = whereUrl(reqs, /\/api\/reviews(?!\/)/, 'GET')
    expect(repoGet.length, 'expected GET /api/repositories/<id>').toBeGreaterThan(0)
    expect(prGet.length, 'expected GET /api/pull-requests?repository_id=<id>').toBeGreaterThan(0)
    expect(reviewGet.length, 'expected GET /api/reviews').toBeGreaterThan(0)
    for (const r of [...repoGet, ...prGet, ...reviewGet]) {
      expect(r.status, `${r.method} ${r.url} should be 2xx`).toBeLessThan(400)
    }
  })

  test('breadcrumb link navigates back to /repos', async ({ page, request }) => {
    const u = await signup(page)
    const seeded = await seedReviewedPR(request, u.accessToken!, {
      repoName: `refract/crumb-${Date.now()}`,
    })
    await page.goto(APP_BASE + '/repos/' + seeded.repo.id)
    await page
      .getByRole('link', { name: /Repositories/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/repos$/)
  })

  test('renders the seeded full_name as the H1', async ({ page, request }) => {
    const u = await signup(page)
    const stamp = Date.now()
    const repoFullName = `refract/h1-test-${stamp}`
    const seeded = await seedReviewedPR(request, u.accessToken!, { repoName: repoFullName })
    await page.goto(APP_BASE + '/repos/' + seeded.repo.id)
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
    await expect(h1).toContainText(repoFullName)
  })

  test('PRs tab is active by default and shows the seeded PR', async ({ page, request }) => {
    const u = await signup(page)
    const seeded = await seedReviewedPR(request, u.accessToken!, {
      repoName: `refract/prs-tab-${Date.now()}`,
    })
    await page.goto(APP_BASE + '/repos/' + seeded.repo.id)
    const prsTab = page.getByRole('button', { name: /Pull requests/i })
    await expect(prsTab).toHaveAttribute('aria-pressed', 'true')
    // The seeded PR's title or its detail link should be visible.
    await expect(page.locator(`a[href="/prs/${seeded.pr.id}"]`).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('clicking Reviews tab flips aria-pressed and shows the reviews list', async ({
    page,
    request,
  }) => {
    const u = await signup(page)
    const seeded = await seedReviewedPR(request, u.accessToken!, {
      repoName: `refract/reviews-tab-${Date.now()}`,
    })
    await page.goto(APP_BASE + '/repos/' + seeded.repo.id)
    const reviewsTab = page.getByRole('button', { name: /^Reviews$/i })
    await reviewsTab.click()
    await expect(reviewsTab).toHaveAttribute('aria-pressed', 'true')
    // The recent-reviews heading appears once the tab is active.
    await expect(page.getByRole('heading', { name: /Recent reviews/i })).toBeVisible({
      timeout: 5000,
    })
  })

  test('clicking Rules tab shows "Open rules editor" link', async ({ page, request }) => {
    const u = await signup(page)
    const seeded = await seedReviewedPR(request, u.accessToken!, {
      repoName: `refract/rules-tab-${Date.now()}`,
    })
    await page.goto(APP_BASE + '/repos/' + seeded.repo.id)
    await page.getByRole('button', { name: /^Rules$/i }).click()
    const link = page.getByRole('link', { name: /Open rules editor/i })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/rules$/)
  })

  test('clicking Repo settings tab shows provider/default_branch/sync_status rows', async ({
    page,
    request,
  }) => {
    const u = await signup(page)
    const seeded = await seedReviewedPR(request, u.accessToken!, {
      repoName: `refract/settings-tab-${Date.now()}`,
    })
    await page.goto(APP_BASE + '/repos/' + seeded.repo.id)
    await page.getByRole('button', { name: /Repo settings/i }).click()
    await expect(page.getByText('Provider', { exact: true })).toBeVisible()
    await expect(page.getByText('Default branch', { exact: true })).toBeVisible()
    await expect(page.getByText('Sync status', { exact: true })).toBeVisible()
  })

  test('PR row link in PRs tab navigates to /prs/:id', async ({ page, request }) => {
    const u = await signup(page)
    const seeded = await seedReviewedPR(request, u.accessToken!, {
      repoName: `refract/pr-nav-${Date.now()}`,
    })
    await page.goto(APP_BASE + '/repos/' + seeded.repo.id)
    const prLink = page.locator(`a[href="/prs/${seeded.pr.id}"]`).first()
    await prLink.waitFor({ timeout: 10000 })
    await prLink.click()
    await expect(page).toHaveURL(new RegExp(`/prs/${seeded.pr.id}`))
  })
})
