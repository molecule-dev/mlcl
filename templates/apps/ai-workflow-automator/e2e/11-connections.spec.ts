import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listConnections, signup } from './_helpers.js'

test.describe('/connections', () => {
  test('renders the connections catalog', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/connections')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('GET /api/connections returns connector entries', async ({ page }) => {
    await signup(page)
    const data = (await listConnections(page)) as {
      data: Array<{ id: string; name: string; status?: string }>
      categories?: string[]
      total?: number
    }
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data.length).toBeGreaterThan(0)
    expect(data.data.find((c) => c.id === 'anthropic')).toBeTruthy()
    expect(data.data.find((c) => c.id === 'webhooks')).toBeTruthy()
  })

  test('captureNetwork: /connections calls /api/connections on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/connections')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => r.method === 'GET' && /\/api\/connections/.test(r.url))
    expect(call).toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('renders at least one IntegrationCard label', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/connections')
    await page.waitForLoadState('networkidle')
    // At minimum, the body should mention one of the canonical providers.
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toMatch(/anthropic|openai|stripe|webhook|cron/)
  })
})
