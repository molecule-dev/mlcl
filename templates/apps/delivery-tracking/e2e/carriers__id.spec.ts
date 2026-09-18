import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, asList, captureNetwork, signup } from './_helpers.js'

test.describe('/carriers/:id', () => {
  test('renders the detail panels for a seeded carrier', async ({ page }) => {
    await signup(page)
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/carriers')
    const target = asList(body)[0] as any
    expect(target).toBeTruthy()
    await page.goto(APP_BASE + `/carriers/${target.id}`)
    await expect(page.getByRole('heading', { name: target.name })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Integration/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Recent shipments/i })).toBeVisible()
  })

  test('mounting actually fires GET /api/carriers/:id and /api/shipments?carrier_id (captureNetwork)', async ({
    page,
  }) => {
    await signup(page)
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/carriers')
    const target = asList(body)[0] as any
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/carriers/${target.id}`)
      await expect(page.getByRole('heading', { name: target.name })).toBeVisible()
    })
    const carrierReq = reqs.find(
      (r) => r.method === 'GET' && r.url.includes(`/api/carriers/${target.id}`),
    )
    expect(carrierReq, 'must GET /api/carriers/:id on mount').toBeTruthy()
    expect(carrierReq?.status).toBe(200)
    const shipmentsReq = reqs.find(
      (r) => r.method === 'GET' && /\/api\/shipments\?.*carrier_id=/.test(r.url),
    )
    expect(shipmentsReq, 'must GET /api/shipments?carrier_id=:id on mount').toBeTruthy()
  })

  test('"All carriers" back link returns to /carriers', async ({ page }) => {
    await signup(page)
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/carriers')
    const target = asList(body)[0] as any
    await page.goto(APP_BASE + `/carriers/${target.id}`)
    await page.getByRole('link', { name: /All carriers/i }).click()
    await expect(page).toHaveURL(/\/carriers$/)
  })

  test('reload preserves the carrier detail (token + route)', async ({ page }) => {
    await signup(page)
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/carriers')
    const target = asList(body)[0] as any
    await page.goto(APP_BASE + `/carriers/${target.id}`)
    await expect(page.getByRole('heading', { name: target.name })).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/carriers/${target.id}`))
    await expect(page.getByRole('heading', { name: target.name })).toBeVisible({ timeout: 10_000 })
  })
})
