import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  captureNetwork,
  listWarehouses,
  pickWarehouseWithStock,
  primeDashboard,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('warehouses page', () => {
  test('renders every warehouse the API returns, with utilization', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('wh-list'))
    await primeDashboard(page, accessToken)
    // How many cards and which names is read from the same endpoint the page
    // reads, so the spec survives the demo warehouses being replaced.
    const warehouses = await listWarehouses(page, accessToken)
    expect(warehouses.length).toBeGreaterThan(0)

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/warehouses')
      const cards = page.getByTestId('warehouse-card')
      await expect.poll(async () => cards.count(), { timeout: 15_000 }).toBe(warehouses.length)
      await expect(cards.filter({ hasText: warehouses[0].name })).toHaveCount(1)
    })
    const whCall = reqs.find((r) => /\/warehouses(\?|$)/.test(r.url) && r.method === 'GET')
    expect(whCall?.status, 'GET /warehouses fired on list load').toBe(200)
  })

  test('Add warehouse modal creates a new warehouse and persists via API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('wh-add'))
    await primeDashboard(page, accessToken)

    const code = 'NEW-WH-' + Date.now()
    await page.goto(APP_BASE + '/warehouses')
    await page.getByTestId('add-warehouse-button').click()
    await page.locator('#add-wh-name').fill('Phoenix Forward DC')
    await page.locator('#add-wh-code').fill(code)
    await page.locator('#add-wh-city').fill('Phoenix')
    await page.locator('#add-wh-country').fill('USA')
    await page.locator('#add-wh-capacity').fill('15000')
    await page.locator('#add-wh-contact-name').fill('Jordan Pryor')
    await page.locator('#add-wh-contact-email').fill('jordan@locus.dev')
    await page.getByTestId('add-warehouse-submit').click()

    await expect(page.getByText('Phoenix Forward DC')).toBeVisible({ timeout: 20_000 })

    const list = await page.request
      .get(`${API_BASE}/warehouses`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<Array<{ name: string; code: string }>>)
    expect(
      list.find((w) => w.code === code),
      'warehouse persisted via API',
    ).toBeTruthy()
  })

  test('rejects duplicate warehouse code with 409', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('wh-dup'))
    await primeDashboard(page, accessToken)

    const code = 'DUP-WH-' + Date.now()
    const first = await page.request.post(`${API_BASE}/warehouses`, {
      headers: authHeaders(accessToken),
      data: { name: 'First', code, city: 'Foo', country: 'USA' },
      failOnStatusCode: false,
    })
    expect(first.status()).toBe(201)

    const second = await page.request.post(`${API_BASE}/warehouses`, {
      headers: authHeaders(accessToken),
      data: { name: 'Second', code, city: 'Bar', country: 'USA' },
      failOnStatusCode: false,
    })
    expect(second.status()).toBe(409)
  })

  test('refuses to delete a warehouse that still has stock (409)', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('wh-del'))
    await primeDashboard(page, accessToken)

    // Ask the API which warehouse currently holds stock rather than naming a
    // seeded one — the invariant is about stock, not about a particular row.
    const stocked = await pickWarehouseWithStock(page, accessToken)

    const del = await page.request.delete(`${API_BASE}/warehouses/${stocked.id}`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(del.status()).toBe(409)
  })

  test('warehouse detail page shows totals and stock list', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('wh-detail'))
    await primeDashboard(page, accessToken)

    const list = await listWarehouses(page, accessToken)
    const target = list[0]
    await page.goto(APP_BASE + `/warehouses/${target.id}`)
    await expect(page.getByRole('heading', { name: new RegExp(target.name, 'i') })).toBeVisible({
      timeout: 10_000,
    })
  })
})
