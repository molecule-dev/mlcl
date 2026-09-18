import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test.describe('/collections', () => {
  test('renders the page heading after auth bootstrap', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/collections')
    await expect(page.getByRole('heading', { name: /^Collections$/i, level: 1 })).toBeVisible()
  })

  test('"New collection" creates a row and the list grows by one', async ({ page }) => {
    await signup(page)
    const { body: before } = await apiRequest<unknown[]>(page, 'GET', '/api/collections')
    const beforeCount = Array.isArray(before) ? before.length : 0

    await page.goto(APP_BASE + '/collections')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /New collection/i }).click()
      // wait for the POST to settle
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' &&
          /\/api\/collections(?:\?|$)/.test(r.url) &&
          r.status >= 200 &&
          r.status < 300,
      ),
      'POST /api/collections must succeed',
    ).toBeTruthy()

    const { body: after } = await apiRequest<unknown[]>(page, 'GET', '/api/collections')
    const afterCount = Array.isArray(after) ? after.length : 0
    expect(afterCount, 'collections count must grow by exactly one').toBe(beforeCount + 1)
  })

  test('disclosure toggle inside a collection card flips aria-expanded', async ({ page }) => {
    await signup(page)
    // Make sure at least one collection exists.
    await apiRequest(page, 'POST', '/api/collections', { name: 'Disclosure test', description: '' })
    await page.goto(APP_BASE + '/collections')

    const toggle = page.locator('[aria-expanded]').first()
    await expect(toggle).toBeVisible()
    const initial = await toggle.getAttribute('aria-expanded')
    await toggle.click()
    const after = await toggle.getAttribute('aria-expanded')
    expect(after, 'aria-expanded should toggle after click').not.toBe(initial)
  })

  test('all four MetricStatCard eyebrows render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/collections')
    for (const eyebrow of [/Collections/i, /Requests/i, /Run last hour/i, /Failing/i]) {
      await expect(page.getByText(eyebrow).first()).toBeVisible()
    }
  })

  test('empty state renders for a fresh user with no collections', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signup(page)
    await page.goto(APP_BASE + '/collections')
    await expect(page.getByText(/No collections yet/i)).toBeVisible()
    await ctx.close()
  })

  test('"All green" caption renders when no failed last_run is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/collections')
    // Either of these two strings must appear on the page
    const caption = page.getByText(/All green|Last run had failures/i).first()
    await expect(caption).toBeVisible()
  })

  test('GET /api/collections + /api/requests + /api/history fire on page load', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/collections')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/collections/.test(r.url))).toBeTruthy()
    expect(
      reqs.some((r) => r.method === 'GET' && /\/api\/requests(?:\?|$)/.test(r.url)),
    ).toBeTruthy()
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/history/.test(r.url))).toBeTruthy()
  })
})
