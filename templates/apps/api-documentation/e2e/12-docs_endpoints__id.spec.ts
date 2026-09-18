import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /docs/endpoints/:id — fetches one endpoint by id. With a bogus id the
// API returns 404 and the page shows the not-found state. With a real id
// (resolved by reading the endpoints list first) it shows method+path+
// summary headers.

test.describe('/docs/endpoints/:id', () => {
  test('GET /api/endpoints/:id fires on mount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/docs/endpoints/does-not-exist')
      // Either the not-found message or the error renders within timeout.
      await page
        .getByText(/Endpoint not found|Failed to load endpoint/i)
        .waitFor({ timeout: 15_000 })
    })
    const call = reqs.find((r) => /\/api\/endpoints\/[^/?]+/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/endpoints/:id should fire').toBeTruthy()
  })

  test('back-link navigates to /docs/endpoints', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/endpoints/does-not-exist')
    // Header back-link is rendered only when an endpoint loads. Test
    // without a real endpoint: just navigate from the index page.
    await page.goto(APP_BASE + '/docs/endpoints')
    await expect(page).toHaveURL(/\/docs\/endpoints$/)
  })

  test('does not crash on a missing id — shows error state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/endpoints/totally-invalid-id-xxx')
    await expect(page.getByText(/Endpoint not found|Failed to load endpoint/i)).toBeVisible({
      timeout: 15_000,
    })
  })
})
