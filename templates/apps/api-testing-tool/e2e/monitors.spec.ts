import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test.describe('/monitors', () => {
  test('renders the page heading after auth bootstrap', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/monitors')
    await expect(page.getByRole('heading', { name: /^Monitors$/i, level: 1 })).toBeVisible()
  })

  test('"New monitor" creates a row and the list grows by one', async ({ page }) => {
    await signup(page)
    const { body: before } = await apiRequest<unknown[]>(page, 'GET', '/api/monitors')
    const beforeCount = Array.isArray(before) ? before.length : 0

    await page.goto(APP_BASE + '/monitors')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="monitors-new"]').click()
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' &&
          /\/api\/monitors(?:\?|$)/.test(r.url) &&
          r.status >= 200 &&
          r.status < 300,
      ),
      'POST /api/monitors must succeed',
    ).toBeTruthy()
    const { body: after } = await apiRequest<unknown[]>(page, 'GET', '/api/monitors')
    expect(Array.isArray(after) ? after.length : 0).toBe(beforeCount + 1)
  })

  test('empty state renders for a fresh user with no monitors', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signup(page)
    await page.goto(APP_BASE + '/monitors')
    await expect(page.getByText(/No monitors scheduled/i)).toBeVisible()
    await ctx.close()
  })

  test('description copy under the H1 renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/monitors')
    await expect(page.getByText(/On-demand checks for any saved test/i)).toBeVisible()
  })

  test('all four MetricStatCard eyebrows render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/monitors')
    for (const eyebrow of [/Avg uptime/i, /^Healthy$/i, /^Degraded$/i, /^Down$/i]) {
      await expect(page.getByText(eyebrow).first()).toBeVisible()
    }
  })

  test('GET /api/monitors fires on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/monitors')
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/monitors/.test(r.url))).toBeTruthy()
  })
})
