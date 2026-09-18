import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedReviewedPR, signup, whereUrl } from './_helpers.js'

test.describe('Search page (/search)', () => {
  test('AuthGuard redirects anonymous visitors to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/search')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('renders heading and search input on initial load', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await expect(page.getByRole('heading', { name: /^Search$/ })).toBeVisible()
    const search = page.getByPlaceholder(/Search PRs/)
    await expect(search).toBeVisible()
    await expect(search).toHaveAttribute('type', 'search')
  })

  test('shows the empty-index state for a brand-new user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await expect(
      page.getByText(/Connect a repository or add custom rules to start indexing\./),
    ).toBeVisible({ timeout: 10000 })
  })

  test('initial load fetches /api/pull-requests, /api/repositories, /api/custom-rules', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/search')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const prs = whereUrl(reqs, /\/api\/pull-requests(?!\/)/, 'GET')
    const repos = whereUrl(reqs, /\/api\/repositories(?!\/)/, 'GET')
    const rules = whereUrl(reqs, /\/api\/custom-rules(?!\/)/, 'GET')
    expect(prs.length, 'expected GET /api/pull-requests on load').toBeGreaterThan(0)
    expect(repos.length, 'expected GET /api/repositories on load').toBeGreaterThan(0)
    expect(rules.length, 'expected GET /api/custom-rules on load').toBeGreaterThan(0)
    for (const r of [...prs, ...repos, ...rules]) {
      expect(r.status, `${r.method} ${r.url} should not 5xx`).toBeLessThan(500)
    }
  })

  test('after seeding a PR, the PR section appears with a link to /prs/<id>', async ({
    page,
    request,
  }) => {
    const u = await signup(page)
    const seeded = await seedReviewedPR(request, u.accessToken!, {
      repoName: `refract/search-${Date.now()}`,
    })
    await page.goto(APP_BASE + '/search')
    // Wait for one of the PR result links to appear.
    const link = page.locator(`a[href="/prs/${seeded.pr.id}"]`).first()
    await expect(link).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: /^PR$/, level: 2 })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Repository$/, level: 2 })).toBeVisible()
  })

  test('typing nonsense in the search box shows the empty-query state', async ({
    page,
    request,
  }) => {
    const u = await signup(page)
    await seedReviewedPR(request, u.accessToken!, { repoName: `refract/searchq-${Date.now()}` })
    await page.goto(APP_BASE + '/search')
    const search = page.getByPlaceholder(/Search PRs/)
    await search.waitFor()
    await search.fill('zzz_definitely_no_match_zzz')
    await expect(page.getByText(/No results match your query\./)).toBeVisible({ timeout: 5000 })
  })

  test('typing a real word filters down to the matching PR', async ({ page, request }) => {
    const u = await signup(page)
    const stamp = Date.now()
    const seeded = await seedReviewedPR(request, u.accessToken!, {
      repoName: `refract/searchfilter-${stamp}`,
      prTitle: `Refactor authn middleware ${stamp}`,
    })
    await page.goto(APP_BASE + '/search')
    const search = page.getByPlaceholder(/Search PRs/)
    await search.waitFor()
    await search.fill(String(stamp))
    await expect(page.locator(`a[href="/prs/${seeded.pr.id}"]`)).toBeVisible({ timeout: 5000 })
  })

  test('clicking a PR result navigates to /prs/<id>', async ({ page, request }) => {
    const u = await signup(page)
    const seeded = await seedReviewedPR(request, u.accessToken!, {
      repoName: `refract/searchclick-${Date.now()}`,
    })
    await page.goto(APP_BASE + '/search')
    const link = page.locator(`a[href="/prs/${seeded.pr.id}"]`).first()
    await link.waitFor({ timeout: 10000 })
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/prs/${seeded.pr.id}`))
  })

  test('clicking a Repository result navigates to /repos/<id>', async ({ page, request }) => {
    const u = await signup(page)
    const seeded = await seedReviewedPR(request, u.accessToken!, {
      repoName: `refract/searchrepo-${Date.now()}`,
    })
    await page.goto(APP_BASE + '/search')
    const link = page.locator(`a[href="/repos/${seeded.repo.id}"]`).first()
    await link.waitFor({ timeout: 10000 })
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/repos/${seeded.repo.id}`))
  })

  test('Rule result, when present, links to /rules', async ({ page, request }) => {
    const u = await signup(page)
    const api = await (await import('./_helpers.js')).authedApi(request, u.accessToken!)
    const stamp = Date.now()
    await api.post('/custom-rules', {
      name: `search-rule-${stamp}`,
      pattern: 'XYZ',
      severity: 'low',
      enabled: true,
    })
    await page.goto(APP_BASE + '/search')
    const link = page.locator('a[href="/rules"]').first()
    await link.waitFor({ timeout: 10000 })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/rules$/)
  })
})
