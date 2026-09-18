import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test.describe('/settings', () => {
  test('renders the page heading after auth bootstrap', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^Settings$/i, level: 1 })).toBeVisible()
  })

  test('Account section renders with the signed-in user email', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    const section = page.locator('[data-mol-id="settings-section-account"]')
    await expect(section).toBeVisible()
    await expect(section).toContainText(email)
  })

  test('Workspace section renders the resource counts', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const section = page.locator('[data-mol-id="settings-section-workspace"]')
    await expect(section).toBeVisible()
    await expect(section).toContainText(/Collections/i)
    await expect(section).toContainText(/Mock servers/i)
    await expect(section).toContainText(/Monitors/i)
  })

  test('Active environment section renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const section = page.locator('[data-mol-id="settings-section-environment"]')
    await expect(section).toBeVisible()
    await expect(section).toContainText(/Active/i)
  })

  test('"Seed starter content" creates a collection + environment (read-after-write on counts)', async ({
    page,
  }) => {
    await signup(page)
    const before = await apiRequest<unknown[]>(page, 'GET', '/api/collections')
    const beforeCol = Array.isArray(before.body) ? before.body.length : 0

    await page.goto(APP_BASE + '/settings')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-seed"]').click()
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

    const after = await apiRequest<unknown[]>(page, 'GET', '/api/collections')
    const afterCol = Array.isArray(after.body) ? after.body.length : 0
    expect(afterCol, 'collections count should grow after seeding').toBeGreaterThan(beforeCol)
  })

  test('all four bootstrap GETs fire on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/environments/.test(r.url))).toBeTruthy()
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/collections/.test(r.url))).toBeTruthy()
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/mocks/.test(r.url))).toBeTruthy()
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/monitors/.test(r.url))).toBeTruthy()
  })
})
