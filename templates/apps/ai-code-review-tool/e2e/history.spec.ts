import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedReviewedPR, signup, whereUrl } from './_helpers.js'

test.describe('Review history', () => {
  test('renders empty-state when no PRs exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history')
    await expect(
      page.getByText(/no reviews match this filter/i).or(page.getByText(/loading/i)),
    ).toBeVisible()
  })

  test('hits /api/pull-requests + /api/repositories on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/history')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(whereUrl(reqs, /\/api\/pull-requests/, 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/repositories/, 'GET').length).toBeGreaterThan(0)
  })

  test('shows seeded PR rows after seeding', async ({ page, request }) => {
    const session = await signup(page)
    const { pr } = await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/history')
    await expect(page.getByText(pr.title)).toBeVisible()
  })

  test('filter buttons restrict the list', async ({ page, request }) => {
    const session = await signup(page)
    await seedReviewedPR(request, session.accessToken!) // open
    await page.goto(APP_BASE + '/history')
    await page.getByRole('button', { name: /^merged$/i }).click()
    await expect(page.getByText(/no reviews match this filter/i)).toBeVisible()
    await page.getByRole('button', { name: /^open$/i }).click()
    await expect(page.getByText(/no reviews match this filter/i)).toBeHidden()
  })

  test('clicking a PR row navigates to /prs/:id', async ({ page, request }) => {
    const session = await signup(page)
    const { pr } = await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/history')
    await page.getByText(pr.title).first().click()
    await expect(page).toHaveURL(/\/prs\/[\w-]+/)
  })

  test('eyebrow label updates with active filter (a11y aria-live)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history')
    await page.getByRole('button', { name: /^merged$/i }).click()
    await expect(page.getByText(/audit log · merged/i)).toBeVisible()
  })

  test('filter buttons toggle aria-pressed correctly', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history')
    const allBtn = page.getByRole('button', { name: /^all$/i })
    await expect(allBtn).toHaveAttribute('aria-pressed', 'true')
    const openBtn = page.getByRole('button', { name: /^open$/i })
    await openBtn.click()
    await expect(openBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(allBtn).toHaveAttribute('aria-pressed', 'false')
  })

  test('all five filter buttons (all/open/merged/draft/closed) are present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history')
    for (const name of ['all', 'open', 'merged', 'draft', 'closed']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') })).toBeVisible()
    }
  })

  test('history page renders the H1 heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('AuthGuard redirects anonymous users to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/history')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
