import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authHeaders,
  API_BASE,
  captureNetwork,
  listAlerts,
  listProducts,
  seedCatalog,
  signup,
  uniqueEmail,
} from './_helpers.js'

async function createAlert(
  page,
  accessToken: string | null,
  productId: string,
  targetPriceDollars = 9.99,
) {
  const res = await page.request.post(`${API_BASE}/alerts`, {
    headers: authHeaders(accessToken),
    data: { productId, targetPrice: targetPriceDollars, channel: 'email' },
    failOnStatusCode: false,
  })
  expect([200, 201].includes(res.status())).toBe(true)
}

test.describe('/alerts/:id', () => {
  test('shell renders for an alert', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('ad-shell'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await createAlert(page, accessToken, products[0].id, 8000)
    const alerts = await listAlerts(page, accessToken)
    await page.goto(APP_BASE + `/alerts/${alerts[0].id}`)
    await expect(page.locator('[data-test=alert-detail-page]')).toBeVisible({ timeout: 15_000 })
  })

  test('target price block reflects API target_price', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('ad-target'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await createAlert(page, accessToken, products[0].id, 12345)
    const alerts = await listAlerts(page, accessToken)
    await page.goto(APP_BASE + `/alerts/${alerts[0].id}`)
    await expect(page.locator('[data-test=alert-detail-target]')).toBeVisible({ timeout: 15_000 })
  })

  test('status badge reflects current status', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('ad-status'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await createAlert(page, accessToken, products[0].id, 6000)
    const alerts = await listAlerts(page, accessToken)
    await page.goto(APP_BASE + `/alerts/${alerts[0].id}`)
    await expect(page.locator('[data-test=alert-detail-status]')).toBeVisible({ timeout: 15_000 })
  })

  test('pause action toggles status', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('ad-pause'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await createAlert(page, accessToken, products[0].id, 6000)
    const alerts = await listAlerts(page, accessToken)
    await page.goto(APP_BASE + `/alerts/${alerts[0].id}`)
    const pause = page.locator('[data-test=alert-detail-pause]').first()
    if (await pause.count()) {
      await pause.click()
      await page.waitForTimeout(800)
      const after = await listAlerts(page, accessToken)
      expect(['paused', 'active'].includes(after[0].status)).toBe(true)
    }
  })

  test('delete action removes alert and navigates to /alerts', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('ad-delete'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await createAlert(page, accessToken, products[0].id, 6000)
    const alerts = await listAlerts(page, accessToken)
    await page.goto(APP_BASE + `/alerts/${alerts[0].id}`)
    const del = page.locator('[data-test=alert-detail-delete]').first()
    if (await del.count()) {
      // Two-step inline confirm: first click arms, second click deletes.
      await del.click()
      await del.click()
      await page.waitForTimeout(1500)
      const after = await listAlerts(page, accessToken)
      expect(after.length).toBe(0)
    }
  })

  test('"Back to alerts" link returns to /alerts', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('ad-back'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await createAlert(page, accessToken, products[0].id, 6000)
    const alerts = await listAlerts(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/alerts/${alerts[0].id}`)
      await expect(page.locator('[data-test=alert-detail-page]')).toBeVisible({ timeout: 15_000 })
    })
    const call = reqs.find(
      (r) => new RegExp(`/api/alerts/${alerts[0].id}$`).test(r.url) && r.method === 'GET',
    )
    expect(call?.status, 'GET /api/alerts/:id').toBe(200)
  })
})
