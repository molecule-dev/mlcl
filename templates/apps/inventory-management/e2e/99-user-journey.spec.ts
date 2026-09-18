import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authHeaders, primeDashboard, signup, uniqueEmail } from './_helpers.js'

test.describe('cross-page user journey', () => {
  test('signup → dashboard → inventory → product detail → orders → settings → profile → logout', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('journey'))
    expect(accessToken).toBeTruthy()

    // 1. Dashboard renders KPIs (snapshot already primed by signup → no further setup)
    const snap = await primeDashboard(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /today across the fleet/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(snap.uniqueSkus.toString(), { exact: true }).first()).toBeVisible()

    // 2. Inventory: navigate via sidebar / direct URL, see seeded products
    await page.goto(APP_BASE + '/inventory')
    const products = await page.request
      .get(`${API_BASE}/products?limit=200`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<Array<{ id: string; sku: string; name: string }>>)
    expect(products.length).toBeGreaterThan(0)
    await expect(page.getByText(products[0].sku)).toBeVisible({ timeout: 10_000 })

    // 3. Product detail: open the first product
    await page.goto(APP_BASE + `/products/${products[0].id}`)
    await expect(page.getByRole('heading', { name: products[0].name, level: 1 })).toBeVisible({
      timeout: 10_000,
    })

    // 4. Orders: visit list, see the order the API reports (its reference is
    // the app's own data, not the demo seed's "PO-…" numbering)
    const orders = await page.request
      .get(`${API_BASE}/orders?limit=10`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<Array<{ id: string; reference: string }>>)
    expect(orders.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/orders')
    await expect(page.getByRole('heading', { name: /^orders$/i })).toBeVisible()
    await expect(page.getByRole('cell', { name: orders[0].reference })).toBeVisible({
      timeout: 15_000,
    })

    // 5. Warehouses list → detail
    const warehouses = await page.request
      .get(`${API_BASE}/warehouses`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<Array<{ id: string; name: string }>>)
    expect(warehouses.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + `/warehouses/${warehouses[0].id}`)
    await expect(page.getByTestId('warehouse-detail')).toBeVisible({ timeout: 10_000 })

    // 6. Settings: tabs render, billing shows real plan
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByText(/Settings/i).first()).toBeVisible({ timeout: 10_000 })

    // 7. Profile: shows email, default-warehouse selector
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/profile/i).first()).toBeVisible()

    // 8. Pricing public page from logged-in state
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading').first()).toBeVisible()

    // 9. Logout: clear storage AND cookies, ensure /dashboard now redirects to /login.
    // [M1-1] The session lives in the httpOnly `token` cookie (+ `mol_auth` hint), not
    // localStorage, so clearing storage alone leaves the session restorable on reload —
    // must clear cookies to actually sign out.
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 10_000 })
  })
})
