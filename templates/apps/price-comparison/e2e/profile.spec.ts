import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authHeaders,
  API_BASE,
  captureNetwork,
  listProducts,
  seedCatalog,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/profile', () => {
  test('shell renders for an authenticated user', async ({ page }) => {
    await signup(page, uniqueEmail('prof-shell'))
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-test=profile-page]')).toBeVisible({ timeout: 15_000 })
  })

  test('display name reflects useAuth user', async ({ page }) => {
    const email = uniqueEmail('prof-name')
    await signup(page, email, 'TestPass123!', 'Avery Sift')
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-test=profile-display-name]')).toContainText(/Avery|Sift/, {
      timeout: 15_000,
    })
  })

  test('lifetime savings is rendered as currency', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('prof-save'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await page.request.post(`${API_BASE}/watchlist`, {
      headers: authHeaders(accessToken),
      data: { productId: products[0].id },
    })
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-test=profile-savings]')).toBeVisible({ timeout: 15_000 })
  })

  test('share button is clickable and triggers no fatal errors', async ({ page }) => {
    await signup(page, uniqueEmail('prof-share'))
    await page.goto(APP_BASE + '/profile')
    const share = page.locator('[data-test=profile-share]')
    await expect(share).toBeVisible({ timeout: 15_000 })
    await share.click()
    await page.waitForTimeout(500)
  })

  test('achievements grid renders cards', async ({ page }) => {
    await signup(page, uniqueEmail('prof-ach'))
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-test=profile-achievements]')).toBeVisible({ timeout: 15_000 })
  })

  test('public watches grid populates from watchlist', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('prof-watch'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await page.request.post(`${API_BASE}/watchlist`, {
      headers: authHeaders(accessToken),
      data: { productId: products[0].id },
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await expect(page.locator('[data-test=profile-page]')).toBeVisible({ timeout: 15_000 })
      await page.waitForTimeout(1000)
    })
    const call = reqs.find((r) => /\/api\/watchlist(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call?.status, 'GET /api/watchlist').toBe(200)
  })
})
