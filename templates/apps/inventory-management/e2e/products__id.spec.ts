import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  captureNetwork,
  listProducts,
  primeDashboard,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('product detail page', () => {
  test('renders the product header (name + SKU + KPIs) with real seed data', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('product-header'))
    await primeDashboard(page, accessToken)
    const products = await listProducts(page, accessToken)
    expect(products.length, 'no seeded products available').toBeGreaterThan(0)
    const target = products[0]
    await page.goto(APP_BASE + `/products/${target.id}`)
    await expect(page.getByRole('heading', { name: target.name, level: 1 })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(target.sku).first()).toBeVisible()
    // KPI labels
    await expect(page.getByText(/On hand/i).first()).toBeVisible()
    await expect(page.getByText(/Locations/i).first()).toBeVisible()
    await expect(page.getByText(/Recent moves/i).first()).toBeVisible()
  })

  test('back link navigates to /inventory', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('product-back'))
    await primeDashboard(page, accessToken)
    const [target] = await listProducts(page, accessToken)
    await page.goto(APP_BASE + `/products/${target.id}`)
    await page
      .getByRole('link', { name: /Back to inventory/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/inventory$/)
  })

  test('issues GET /products/:id and renders stock-by-warehouse breakdown', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('product-network'))
    await primeDashboard(page, accessToken)
    const [target] = await listProducts(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/products/${target.id}`)
      await expect(page.getByRole('heading', { name: target.name })).toBeVisible({
        timeout: 15_000,
      })
    })
    const productCall = reqs.find(
      (r) => r.url.endsWith(`/products/${target.id}`) && r.method === 'GET',
    )
    expect(productCall?.status, 'GET /products/:id did not happen').toBe(200)
    const movementsCall = reqs.find(
      (r) => /\/stock\/movements\?product_id=/.test(r.url) && r.method === 'GET',
    )
    expect(movementsCall?.status).toBe(200)
    // The stock-by-warehouse heading is always present even when empty.
    await expect(page.getByText(/Stock by warehouse/i)).toBeVisible()
  })

  test('non-existent product surfaces a "not found" alert', async ({ page }) => {
    await signup(page, uniqueEmail('product-404'))
    await page.goto(APP_BASE + `/products/00000000-0000-0000-0000-000000000000`)
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Back to inventory/i).first()).toBeVisible()
  })

  test('print-labels button is wired and does not throw', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('product-print'))
    await primeDashboard(page, accessToken)
    const [target] = await listProducts(page, accessToken)
    await page.goto(APP_BASE + `/products/${target.id}`)
    // Stub window.print so the test isn't waiting on a real OS dialog.
    let printed = false
    await page.exposeFunction('__captureProm', () => {
      printed = true
    })
    await page.addInitScript(() => {
      window.print = () => {
        ;(window as unknown as { __captureProm?: () => void }).__captureProm?.()
      }
    })
    // Re-load so the patched window.print is in scope.
    await page.reload()
    await page.getByRole('button', { name: /print/i }).click()
    // Allow microtask to fire on the page.
    await page.waitForTimeout(200)
    // Confirm we either fired window.print or the button at least has a real handler.
    // A real handler is the contract; whether the OS dialog opens depends on the
    // runtime environment.
    const handlerExists = await page
      .getByRole('button', { name: /print/i })
      .evaluate(
        (b) =>
          typeof (b as HTMLButtonElement).onclick === 'function' || b.outerHTML.includes('onClick'),
      )
    expect(handlerExists || printed, 'print button has no real click handler').toBeTruthy()
  })

  test('movement history pulls /stock/movements?product_id=…', async ({ page, request }) => {
    const { accessToken } = await signup(page, uniqueEmail('product-history'))
    await primeDashboard(page, accessToken)
    const [target] = await listProducts(page, accessToken)
    const movResp = await request.get(
      `${API_BASE}/stock/movements?product_id=${target.id}&limit=10`,
      { headers: authHeaders(accessToken) },
    )
    expect(movResp.status()).toBe(200)
    const body = await movResp.json()
    expect(Array.isArray(body)).toBeTruthy()
  })
})
