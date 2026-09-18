import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers'

// /docs (DocsHome) — first page after signup. Loads endpoint inventory
// from /api/endpoints, surfaces method counts, recent endpoints list,
// and a static guides grid. Requires auth.

test.describe('/docs', () => {
  test('renders heading and fires GET /api/endpoints on mount', async ({ page }) => {
    await signup(page)
    // Arm the response waiter BEFORE navigating so we deterministically
    // catch the /api/endpoints fetch regardless of when it fires
    // relative to the heading render.
    const respPromise = page.waitForResponse(
      (r) => /\/api\/endpoints(?:\?|$)/.test(r.url()) && r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/docs')
    await expect(page.getByRole('heading', { name: /Getting started with the API/i })).toBeVisible({
      timeout: 15_000,
    })
    const resp = await respPromise
    expect(resp.status()).toBe(200)
  })

  test('Browse all → /docs/endpoints', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs')
    await page.getByRole('link', { name: /browse all/i }).click()
    await expect(page).toHaveURL(/\/docs\/endpoints$/)
  })

  test('All guides → /docs/guides', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs')
    await page.getByRole('link', { name: /all guides/i }).click()
    await expect(page).toHaveURL(/\/docs\/guides$/)
  })
})
