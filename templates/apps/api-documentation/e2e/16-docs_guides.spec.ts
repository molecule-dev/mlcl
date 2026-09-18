import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /docs/guides — fetches /api/guides (handler returns a static catalog,
// always populated). Renders a card per guide with category, read-time,
// updated date.

test.describe('/docs/guides', () => {
  test('GET /api/guides fires + heading visible', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/docs/guides')
      await page.getByRole('heading', { name: /Long-form how-tos/i }).waitFor({ timeout: 15_000 })
    })
    const call = reqs.find((r) => /\/api\/guides(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/guides should fire').toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('first guide tile is a link to /docs/guides/<id>', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/guides')
    await page.getByRole('heading', { name: /Long-form how-tos/i }).waitFor({ timeout: 15_000 })
    const firstLink = page
      .getByRole('link')
      .filter({ hasText: /quickstart|authentication|pagination/i })
      .first()
    const href = await firstLink.getAttribute('href')
    expect(href, 'first guide tile should link to /docs/guides/<id>').toMatch(/^\/docs\/guides\//)
  })

  test('first guide row shows a read-time pill ("N min read")', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/guides')
    await page.getByRole('heading', { name: /Long-form how-tos/i }).waitFor({ timeout: 15_000 })
    await expect(page.getByText(/min read/i).first()).toBeVisible({ timeout: 15_000 })
  })
})
