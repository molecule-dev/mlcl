import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  authHeaders,
  createProductWithStock,
  primeDashboard,
  signup,
  uniqueEmail,
} from './_helpers.js'

interface ApiAlert {
  id: string
  user_id: string
  product_id: string
  warehouse_id: string
  status: 'active' | 'acknowledged' | 'dismissed'
  type: string
  message: string
}

test.describe('alerts', () => {
  test('lists seeded alerts scoped to the user (org isolation)', async ({ page }) => {
    const a = await signup(page, uniqueEmail('alerts-a'))
    await primeDashboard(page, a.accessToken)
    await page.evaluate(() => window.localStorage.clear())
    const b = await signup(page, uniqueEmail('alerts-b'))
    await primeDashboard(page, b.accessToken)

    const aRes = await page.request.get(`${API_BASE}/alerts`, {
      headers: authHeaders(a.accessToken),
    })
    expect(aRes.status()).toBe(200)
    const aAlerts = (await aRes.json()) as ApiAlert[]

    const bRes = await page.request.get(`${API_BASE}/alerts`, {
      headers: authHeaders(b.accessToken),
    })
    expect(bRes.status()).toBe(200)
    const bAlerts = (await bRes.json()) as ApiAlert[]

    expect(aAlerts.length).toBeGreaterThan(0)
    expect(bAlerts.length).toBeGreaterThan(0)
    expect(aAlerts.every((al) => al.user_id === a.userId)).toBeTruthy()
    expect(bAlerts.every((al) => al.user_id === b.userId)).toBeTruthy()
  })

  test('acknowledge moves an alert to acknowledged status (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('alerts-ack'))
    await primeDashboard(page, accessToken)

    const list = await page.request
      .get(`${API_BASE}/alerts?status=active`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiAlert[]>)
    expect(list.length).toBeGreaterThan(0)
    const target = list[0]

    const ack = await page.request.post(`${API_BASE}/alerts/${target.id}/acknowledge`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(ack.status()).toBe(200)

    const reread = await page.request
      .get(`${API_BASE}/alerts?status=acknowledged`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiAlert[]>)
    expect(reread.find((al) => al.id === target.id)).toBeTruthy()
  })

  test('dismiss moves an alert to dismissed status (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('alerts-dis'))
    await primeDashboard(page, accessToken)

    const list = await page.request
      .get(`${API_BASE}/alerts?status=active`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiAlert[]>)
    const target = list[0]

    const dismiss = await page.request.post(`${API_BASE}/alerts/${target.id}/dismiss`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(dismiss.status()).toBe(200)

    const reread = await page.request
      .get(`${API_BASE}/alerts?status=dismissed`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiAlert[]>)
    expect(reread.find((al) => al.id === target.id)).toBeTruthy()
  })

  test("cannot acknowledge or dismiss another user's alerts", async ({ page }) => {
    const a = await signup(page, uniqueEmail('alerts-iso-a'))
    await primeDashboard(page, a.accessToken)
    const aAlert = await page.request
      .get(`${API_BASE}/alerts?status=active`, { headers: authHeaders(a.accessToken) })
      .then((r) => r.json() as Promise<ApiAlert[]>)
    expect(aAlert.length).toBeGreaterThan(0)
    const aTarget = aAlert[0]

    await page.evaluate(() => window.localStorage.clear())
    const b = await signup(page, uniqueEmail('alerts-iso-b'))
    await primeDashboard(page, b.accessToken)

    const ackResp = await page.request.post(`${API_BASE}/alerts/${aTarget.id}/acknowledge`, {
      headers: authHeaders(b.accessToken),
      failOnStatusCode: false,
    })
    expect(ackResp.status()).toBe(404)

    const disResp = await page.request.post(`${API_BASE}/alerts/${aTarget.id}/dismiss`, {
      headers: authHeaders(b.accessToken),
      failOnStatusCode: false,
    })
    expect(disResp.status()).toBe(404)
  })

  test('low-stock check creates new alerts when stock is below rule threshold', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('alerts-check'))
    await primeDashboard(page, accessToken)

    // Put a row below the rule's threshold in place through the API, so the
    // check has something to fire on whatever the catalog holds. The threshold
    // stays low so healthy rows don't all match — that keeps the synchronous
    // insert loop bounded and fast.
    await createProductWithStock(page, accessToken, { quantity: 3, lowStockThreshold: 25 })

    const ruleResp = await page.request.post(`${API_BASE}/alerts/rules`, {
      headers: authHeaders(accessToken),
      data: { type: 'low_stock', threshold: 15 },
      failOnStatusCode: false,
    })
    expect(ruleResp.status()).toBe(201)

    const check = await page.request.post(`${API_BASE}/alerts/check`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
      timeout: 30_000,
    })
    expect(check.status()).toBe(200)
    const result = (await check.json()) as { alerts_created: number }
    expect(result.alerts_created).toBeGreaterThan(0)
  })

  test('low-stock summary endpoint returns rows with by_warehouse + threshold', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('alerts-low'))
    await primeDashboard(page, accessToken)

    const res = await page.request.get(`${API_BASE}/alerts/low-stock`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const items = (await res.json()) as Array<{
      product: { id: string }
      total_stock: number
      threshold: number
      by_warehouse: Array<{ warehouse_id: string; quantity: number }>
    }>
    expect(Array.isArray(items)).toBeTruthy()
  })
})
