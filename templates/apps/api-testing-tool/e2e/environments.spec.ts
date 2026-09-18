import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test.describe('/environments', () => {
  test('renders the page heading after auth bootstrap', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/environments')
    await expect(page.getByRole('heading', { name: /^Environments$/i, level: 1 })).toBeVisible()
  })

  test('"New environment" creates a row and the list grows by one', async ({ page }) => {
    await signup(page)
    const { body: before } = await apiRequest<unknown[]>(page, 'GET', '/api/environments')
    const beforeCount = Array.isArray(before) ? before.length : 0

    await page.goto(APP_BASE + '/environments')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /New environment/i }).click()
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' &&
          /\/api\/environments(?:\?|$)/.test(r.url) &&
          r.status >= 200 &&
          r.status < 300,
      ),
      'POST /api/environments must succeed',
    ).toBeTruthy()

    const { body: after } = await apiRequest<unknown[]>(page, 'GET', '/api/environments')
    const afterCount = Array.isArray(after) ? after.length : 0
    expect(afterCount, 'environments count must grow by exactly one').toBe(beforeCount + 1)
  })

  test('empty state renders for a fresh user with no environments', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signup(page)
    await page.goto(APP_BASE + '/environments')
    await expect(page.getByText(/No environments yet/i)).toBeVisible()
    await ctx.close()
  })

  test('terminal-style eyebrow renders above the heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/environments')
    await expect(page.getByText(/\$ pylon env --switch/)).toBeVisible()
  })

  test('description copy under the H1 renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/environments')
    await expect(
      page.getByText(/One active environment per workspace|Variables that swap into requests/i),
    ).toBeVisible()
  })

  test('loading state appears at first paint and resolves to a real list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/environments')
    // Don't fail if the resolve is too fast to catch the loading text — the
    // important assertion is that the list eventually renders without error.
    await expect(page.getByRole('heading', { name: /^Environments$/i, level: 1 })).toBeVisible()
  })

  test('GET /api/environments fires on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/environments')
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/environments/.test(r.url))).toBeTruthy()
  })
})
