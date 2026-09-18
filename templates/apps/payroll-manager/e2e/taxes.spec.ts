import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, captureNetwork, signupAndToken } from './_helpers'

test.describe('/taxes', () => {
  test('renders the YTD tax buckets and quarter table', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/taxes')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    await expect(page.getByRole('heading', { name: /tax center/i })).toBeVisible()
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/reports\/tax-liability/.test(r.url)),
    ).toBeDefined()
  })

  test('changing year reloads tax data', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    await page.goto(APP_BASE + '/taxes')
    await page.waitForLoadState('networkidle').catch(() => {})
    const select = page.getByRole('combobox').first()
    const currentYear = new Date().getFullYear()
    const reqs = await captureNetwork(page, async () => {
      await select.selectOption(String(currentYear - 1))
      await page.waitForTimeout(800)
    })
    expect(
      reqs.find((r) => r.method === 'GET' && r.url.includes(`year=${currentYear - 1}`)),
      'switching the year picker must re-GET tax-liability for that year',
    ).toBeDefined()
  })

  test('GET /api/taxes/brackets exposes seeded bracket rows', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const { status, body } = await apiGet<unknown[]>(page, token, '/taxes/brackets')
    expect(status).toBe(200)
    const rows = (Array.isArray(body) ? body : (body as { data?: unknown[] }).data) ?? []
    expect(rows.length, 'tax brackets must be migrated as seed data').toBeGreaterThan(0)
  })
})
