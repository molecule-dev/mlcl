import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Tool library page', () => {
  test('redirects unauthenticated visitors', async ({ page }) => {
    await page.goto(APP_BASE + '/tools')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('renders empty state, Register button, and GET /api/tools fires', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/tools')
      await expect(page.locator('[data-mol-id="page-tool-library"]')).toBeVisible()
    })
    await expect(page.locator('[data-mol-id="tool-library-register"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="tool-library-empty"]')).toBeVisible()
    const gets = whereUrl(reqs, /\/api\/tools(\?|$)/, 'GET')
    expect(gets.length, 'GET /api/tools on load').toBeGreaterThanOrEqual(1)
  })

  test('seeded tool renders as a card and Uninstall removes it (read-after-write)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = authedApi(request, session.accessToken!)
    const created = await api.post('/tools', {
      name: 'web_search',
      description: 'Real-time web results',
      type: 'http',
      schema_json: {},
      handler_config_json: {},
    })
    expect(created.status()).toBe(201)

    await page.goto(APP_BASE + '/tools')
    await expect(page.locator('[data-mol-id="tool-library-card"]').first()).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText('web_search')).toBeVisible()

    await page.locator('[data-mol-id="tool-library-uninstall"]').first().click()
    await expect(page.locator('[data-mol-id="tool-library-empty"]')).toBeVisible({
      timeout: 10000,
    })

    const after = await api.get('/tools')
    expect((await after.json()) as unknown[]).toEqual([])
  })
})
