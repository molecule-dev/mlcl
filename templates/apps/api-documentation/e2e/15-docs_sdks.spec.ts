import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /docs/sdks — fetches /api/sdks and renders cards or the empty-state
// "No SDKs published yet."

test.describe('/docs/sdks', () => {
  test('GET /api/sdks fires on mount and returns 200', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/docs/sdks')
      await page.getByRole('heading', { name: /^SDKs$/i }).waitFor({ timeout: 15_000 })
    })
    const call = reqs.find((r) => /\/api\/sdks(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/sdks should fire').toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('eyebrow label visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/sdks')
    await expect(page.getByText(/CLIENT_LIBS/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('renders either ≥1 SDK card OR empty-state — never hangs', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/sdks')
    await page.getByRole('heading', { name: /^SDKs$/i }).waitFor({ timeout: 15_000 })
    await expect(page.getByText(/^loading…$/i)).not.toBeVisible({ timeout: 15_000 })
    const eitherShown = await page
      .getByText(/No SDKs published yet|view on github/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(eitherShown, 'either SDK card or empty state must be visible').toBeTruthy()
  })
})
