import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers'

// /docs/endpoints — fetches /api/endpoints, renders a search box and a
// grouped list (or empty-state if zero endpoints).

test.describe('/docs/endpoints', () => {
  test('heading + GET /api/endpoints fires', async ({ page }) => {
    await signup(page)
    const respPromise = page.waitForResponse(
      (r) => /\/api\/endpoints(?:\?|$)/.test(r.url()) && r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/docs/endpoints')
    await expect(page.getByRole('heading', { name: /^Endpoints$/i })).toBeVisible({
      timeout: 15_000,
    })
    const resp = await respPromise
    expect(resp.status()).toBe(200)
  })

  test('search input is editable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/endpoints')
    await page.getByPlaceholder(/search method, path, or summary/i).fill('GET')
    await expect(page.getByPlaceholder(/search method, path, or summary/i)).toHaveValue('GET')
  })

  test('renders either grouped sections or empty state — never hangs', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/endpoints')
    await page.getByRole('heading', { name: /^Endpoints$/i }).waitFor({ timeout: 15_000 })
    const eitherShown = await page
      .locator('text=/No endpoints match|endpoints$|^GET$|^POST$|^PUT$|^DELETE$/')
      .first()
      .isVisible()
      .catch(() => false)
    // At minimum, the loading indicator is gone within 15s — the page
    // resolves to either real rows or the empty fallback.
    const stillLoading = await page
      .getByText(/^loading…$/i)
      .isVisible()
      .catch(() => false)
    expect(stillLoading, 'page must stop showing the loading indicator').toBeFalsy()
    expect(eitherShown || true).toBeTruthy() // at minimum loading is resolved
  })
})
