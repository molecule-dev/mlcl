import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /docs/errors — fetches /api/api_errors and renders grouped 4xx/5xx
// sections, OR an empty-state message ("No errors documented yet…")
// when the table is empty (fresh DB).

test.describe('/docs/errors', () => {
  test('GET /api/api_errors fires on mount and returns 200', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/docs/errors')
      await page.getByRole('heading', { name: /^Errors$/i }).waitFor({ timeout: 15_000 })
    })
    const call = reqs.find((r) => /\/api\/api_errors(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/api_errors should fire').toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('eyebrow label visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/errors')
    await expect(page.getByText(/error_ref/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('renders either grouped sections OR a fallback message — never hangs', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/errors')
    await page.getByRole('heading', { name: /^Errors$/i }).waitFor({ timeout: 15_000 })
    await expect(page.getByText(/^loading…$/i)).not.toBeVisible({ timeout: 15_000 })
    const eitherShown = await page
      .getByText(/4xx — Client errors|5xx — Server errors|No errors documented|Failed to load/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(
      eitherShown,
      'either grouped sections, empty state, or error message must be visible',
    ).toBeTruthy()
  })
})
