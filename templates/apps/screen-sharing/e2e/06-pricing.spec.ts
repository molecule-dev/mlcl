import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork } from './_helpers.js'

test.describe('pricing /pricing', () => {
  test('page loads and exposes Free / Pro / Team tiers', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/free/i).first()).toBeVisible()
    await expect(page.getByText(/pro/i).first()).toBeVisible()
    await expect(page.getByText(/team/i).first()).toBeVisible()
  })

  test('GET /api/billing/tiers returns the configured ladder', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/billing/tiers`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { data?: Array<{ key: string }> }
    const keys = body.data?.map((t) => t.key)
    expect(keys).toEqual(expect.arrayContaining(['free', 'pro', 'team']))
  })

  test('initial render hits /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')
    expect(call?.status).toBe(200)
  })

  test('CTA links route into the funnel (signup or login)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const cta = page
      .getByRole('link')
      .or(page.getByRole('button'))
      .filter({ hasText: /sign\s*up|get\s*started|upgrade|choose/i })
      .first()
    await expect(cta.first()).toBeAttached()
  })
})
