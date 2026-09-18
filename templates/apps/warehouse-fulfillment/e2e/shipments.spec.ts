import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  listShipments,
  seedSampleData,
  signup,
} from './_helpers.js'

test.describe('/shipments list + create label + status update', () => {
  test('seeded shipments render with carrier + tracking', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    await page.goto(APP_BASE + '/shipments')
    await expect(page.getByTestId('shipments-page')).toBeVisible()
    const ship = await listShipments(page, accessToken)
    expect(ship.length).toBeGreaterThan(0)
  })

  test('Create label flow persists a new shipment with mock tracking', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/shipments')
    await page.getByTestId('shipments-new-toggle').click()
    await expect(page.getByTestId('shipments-new-form')).toBeVisible()
    await page.getByTestId('shipments-carrier').selectOption('ups')
    await page.getByTestId('shipments-create-submit').click()
    await page.waitForTimeout(800)
    const ship = await listShipments(page, accessToken)
    const created = ship[0]
    expect(created, 'newest shipment').toBeTruthy()
    expect(created.tracking_number, 'mock provider mints a tracking number').toMatch(/^MOCK-/)
    expect(created.carrier).toBe('ups')
  })

  test('POST /shipments/:id/status appends an event and updates the row', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    const ship = await listShipments(page, accessToken)
    const target = ship[0]
    expect(target).toBeTruthy()
    const res = await page.request.post(`${API_BASE}/shipments/${target.id}/status`, {
      headers: apiHeaders(accessToken),
      data: { status: 'in_transit', description: 'In transit (e2e)', location: 'CA' },
      failOnStatusCode: false,
    })
    expect(res.ok(), await res.text()).toBe(true)

    const detailRes = await page.request.get(`${API_BASE}/shipments/${target.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(detailRes.ok()).toBe(true)
    const detail = (await detailRes.json()) as { status: string; events: Array<{ status: string }> }
    expect(detail.status).toBe('in_transit')
    expect(Array.isArray(detail.events)).toBe(true)
    expect(detail.events.some((e) => e.status === 'in_transit')).toBe(true)
  })
})
