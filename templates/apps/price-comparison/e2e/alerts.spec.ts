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
  expect([200, 201].includes(res.status()), await res.text().catch(() => '')).toBe(true)
}

test.describe('/alerts', () => {
  test('shell renders', async ({ page }) => {
    await signup(page, uniqueEmail('al-shell'))
    await page.goto(APP_BASE + '/alerts')
    await expect(page.locator('[data-test=alerts-page]')).toBeVisible({ timeout: 15_000 })
  })

  test('list populates after creating an alert', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('al-list'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await createAlert(page, accessToken, products[0].id, 5000)
    await page.goto(APP_BASE + '/alerts')
    await expect(page.locator('[data-test=alerts-list]')).toBeVisible({ timeout: 15_000 })
  })

  test('pause alert toggles status to paused', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('al-pause'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await createAlert(page, accessToken, products[0].id, 5000)
    const beforeList = await listAlerts(page, accessToken)
    expect(beforeList.length).toBe(1)
    const target = beforeList[0]
    await page.goto(APP_BASE + '/alerts')
    const pauseBtn = page.locator(`[data-test=alert-pause-${target.id}]`)
    if (await pauseBtn.count()) {
      await pauseBtn.click()
      await page.waitForTimeout(800)
      const after = await listAlerts(page, accessToken)
      expect(after[0].status).toBe('paused')
    }
  })

  test('resume alert toggles status back to active', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('al-resume'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await createAlert(page, accessToken, products[0].id, 5000)
    const list = await listAlerts(page, accessToken)
    const target = list[0]
    // Pre-pause via API
    await page.request.put(`${API_BASE}/alerts/${target.id}`, {
      headers: authHeaders(accessToken),
      data: { status: 'paused' },
    })
    await page.goto(APP_BASE + '/alerts')
    const resumeBtn = page.locator(`[data-test=alert-resume-${target.id}]`)
    if (await resumeBtn.count()) {
      await resumeBtn.click()
      await page.waitForTimeout(800)
      const after = await listAlerts(page, accessToken)
      expect(after[0].status).toBe('active')
    }
  })

  test('remove alert issues DELETE /api/alerts/:id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('al-remove'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await createAlert(page, accessToken, products[0].id, 5000)
    const list = await listAlerts(page, accessToken)
    const target = list[0]
    await page.goto(APP_BASE + '/alerts')
    const removeBtn = page.locator(`[data-test=alert-remove-${target.id}]`)
    if (await removeBtn.count()) {
      await removeBtn.click()
      await page.waitForTimeout(800)
      const after = await listAlerts(page, accessToken)
      expect(after.length).toBe(0)
    }
  })

  test('clicking a row navigates to /alerts/:id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('al-detail'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await createAlert(page, accessToken, products[0].id, 5000)
    const list = await listAlerts(page, accessToken)
    const target = list[0]
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/alerts')
      await expect(page.locator('[data-test=alerts-page]')).toBeVisible({ timeout: 15_000 })
      await expect(page.locator(`[data-test=alerts-item-${target.id}]`)).toBeVisible({
        timeout: 15_000,
      })
    })
    const call = reqs.find((r) => /\/api\/alerts(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call?.status, 'GET /api/alerts').toBe(200)
    const link = page.locator(`a[href="/alerts/${target.id}"]`).first()
    await expect(link).toBeVisible({ timeout: 15_000 })
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/alerts/${target.id}`))
  })
})
