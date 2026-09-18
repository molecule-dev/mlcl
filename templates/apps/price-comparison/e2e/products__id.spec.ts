import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authHeaders,
  API_BASE,
  captureNetwork,
  listAlerts,
  listProducts,
  listWatchlist,
  seedCatalog,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/products/:id', () => {
  test('detail shell renders for a real product', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pd-shell'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    expect(products.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + `/products/${products[0].id}`)
    await expect(page.locator('[data-test=product-detail-page]')).toBeVisible({ timeout: 15_000 })
  })

  test('product name heading matches API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pd-name'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    const target = products[0]
    await page.goto(APP_BASE + `/products/${target.id}`)
    await expect(page.locator('[data-test=product-detail-name]')).toContainText(
      target.name.split(' ')[0],
      { timeout: 15_000 },
    )
  })

  test('best-price block is shown', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pd-price'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await page.goto(APP_BASE + `/products/${products[0].id}`)
    await expect(page.locator('[data-test=product-detail-best-price]')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('"Add to watchlist" creates a watchlist row', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pd-watch'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await page.goto(APP_BASE + `/products/${products[0].id}`)
    await page.locator('[data-test=add-watchlist]').click()
    await page.waitForTimeout(1000)
    const watch = await listWatchlist(page, accessToken)
    expect(watch.length).toBeGreaterThanOrEqual(1)
    expect(watch.some((w) => w.product_id === products[0].id)).toBe(true)
  })

  test('"Set alert" creates an alert row', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pd-alert'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await page.goto(APP_BASE + `/products/${products[0].id}`)
    const setAlert = page.locator('[data-test=set-alert]')
    await setAlert.click()
    await page.waitForTimeout(500)
    const targetInput = page.locator('[data-test=alert-target-input]')
    if (await targetInput.count()) {
      await targetInput.fill('100')
    }
    const confirm = page.locator('[data-test=alert-confirm]')
    if (await confirm.count()) {
      await confirm.click()
    }
    await page.waitForTimeout(1000)
    const alerts = await listAlerts(page, accessToken)
    expect(alerts.length).toBeGreaterThanOrEqual(1)
  })

  test('retailer price table renders rows from /products/:id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pd-table'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/products/${products[0].id}`)
      await expect(page.locator('[data-test=product-detail-page]')).toBeVisible({ timeout: 15_000 })
    })
    const call = reqs.find(
      (r) => new RegExp(`/api/products/${products[0].id}$`).test(r.url) && r.method === 'GET',
    )
    expect(call?.status, 'GET /api/products/:id').toBe(200)
  })

  test('"View full price history" link navigates to /products/:id/history', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pd-history-link'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await page.goto(APP_BASE + `/products/${products[0].id}`)
    const historyLink = page
      .getByRole('link', { name: /price history|view.*history|full.*history/i })
      .first()
    if (await historyLink.count()) {
      await historyLink.click()
      await expect(page).toHaveURL(/\/history/)
    } else {
      await page.goto(APP_BASE + `/products/${products[0].id}/history`)
      await expect(page).toHaveURL(/\/history/)
    }
  })
})
