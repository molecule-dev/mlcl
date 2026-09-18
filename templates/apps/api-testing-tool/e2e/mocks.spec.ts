import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test.describe('/mocks', () => {
  test('renders the page heading after auth bootstrap', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/mocks')
    await expect(page.getByRole('heading', { name: /^Mock servers$/i, level: 1 })).toBeVisible()
  })

  test('"New mock" creates a row and the list grows by one', async ({ page }) => {
    await signup(page)
    const { body: before } = await apiRequest<unknown[]>(page, 'GET', '/api/mocks')
    const beforeCount = Array.isArray(before) ? before.length : 0

    await page.goto(APP_BASE + '/mocks')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="mocks-new"]').click()
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' &&
          /\/api\/mocks(?:\?|$)/.test(r.url) &&
          r.status >= 200 &&
          r.status < 300,
      ),
      'POST /api/mocks must succeed',
    ).toBeTruthy()
    const { body: after } = await apiRequest<unknown[]>(page, 'GET', '/api/mocks')
    expect(Array.isArray(after) ? after.length : 0).toBe(beforeCount + 1)
  })

  test('empty state renders for a fresh user with no mocks', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signup(page)
    await page.goto(APP_BASE + '/mocks')
    await expect(page.getByText(/No mocks yet/i)).toBeVisible()
    await ctx.close()
  })

  test('description copy under the H1 renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/mocks')
    await expect(page.getByText(/Spin up deterministic stand-ins/i)).toBeVisible()
  })

  test('all four MetricStatCard eyebrows render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/mocks')
    for (const eyebrow of [/^Mocks$/i, /^Public$/i, /^Endpoints$/i, /Avg latency/i]) {
      await expect(page.getByText(eyebrow).first()).toBeVisible()
    }
  })

  test('GET /api/mocks fires on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/mocks')
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/mocks/.test(r.url))).toBeTruthy()
  })
})
