import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Datasets page', () => {
  test('redirects unauthenticated visitors', async ({ page }) => {
    await page.goto(APP_BASE + '/datasets')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('renders empty state and Upload button for a fresh account; GET /api/datasets fires', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/datasets')
      await expect(page.locator('[data-mol-id="page-datasets"]')).toBeVisible()
    })
    await expect(page.locator('[data-mol-id="datasets-upload"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="datasets-empty"]')).toBeVisible()
    const gets = whereUrl(reqs, /\/api\/datasets(\?|$)/, 'GET')
    expect(gets.length, 'GET /api/datasets should fire on page load').toBeGreaterThanOrEqual(1)
  })

  test('seeded dataset renders as a card', async ({ page, request }) => {
    const session = await signup(page)
    await authedApi(request, session.accessToken!).post('/datasets', {
      name: 'Smoke Eval',
      description: 'Tiny smoke test fixture',
      format: 'jsonl',
      row_count: 42,
    })
    await page.goto(APP_BASE + '/datasets')
    await expect(page.locator('[data-mol-id="datasets-card"]').first()).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText('Smoke Eval')).toBeVisible()
    await expect(page.getByText(/42 rows/)).toBeVisible()
  })
})
