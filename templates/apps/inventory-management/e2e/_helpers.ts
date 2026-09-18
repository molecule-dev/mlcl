// Shared helpers for inventory-management flagship e2e specs. Every spec
// imports from here rather than rewriting auth/network plumbing.

import { ConsoleMessage, Page, Response, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'inv') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
  accessToken: string | null
  userId: string | null
}

/** Sign up a fresh user via the UI. Returns credentials AND the JWT
 *  bearer token persisted to localStorage so callers can drive
 *  page.request.* with bearer auth.
 *
 *  Hardened against an auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit, assert 2xx, wait for navigation off /signup,
 *  then poll localStorage until the access token actually lands.
 *  Without these gates the access-token read sometimes returned null
 *  because the auth-state hook hadn't persisted it yet. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('#fld-first-name').fill('Avery')
  await page.locator('#fld-last-name').fill('Chen')
  await page.locator('#fld-work-email').fill(email)
  await page.locator('#fld-password').fill(password)
  await page.locator('#fld-confirm-password').fill(password)
  const submit = page.getByRole('button', { name: /create\s*account/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const userRes = await page.request.get(`${API_BASE}/users/me`)
  let userId: string | null = null
  if (userRes.ok()) {
    const me = (await userRes.json()) as { props?: { id?: string }; id?: string }
    userId = me?.props?.id ?? me?.id ?? null
  }
  return { email, password, accessToken, userId }
}

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('#fld-work-email').fill(email)
  await page.locator('#fld-password').fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
}

export async function logout(page: Page) {
  await page.evaluate(() => window.localStorage.clear())
}

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: Response) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

/** Fail the test if any console.error fires during fn (allowing benign
 *  third-party noise like favicon 404s). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export interface ApiProduct {
  id: string
  user_id: string
  name: string
  sku: string
  category?: string | null
  cost_price?: number
  sell_price?: number
  low_stock_threshold?: number
  status?: 'active' | 'archived' | 'draft'
}

export interface ApiWarehouse {
  id: string
  user_id: string
  name: string
  code: string
  city?: string | null
  country?: string | null
  capacity?: number | null
  status?: string
}

export interface ApiStockLevel {
  product_id: string
  warehouse_id: string
  quantity: number
}

export async function listProducts(page: Page, accessToken: string | null): Promise<ApiProduct[]> {
  const res = await page.request.get(`${API_BASE}/products?limit=200`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  const body = (await res.json()) as ApiProduct[]
  return Array.isArray(body) ? body : []
}

export async function listWarehouses(
  page: Page,
  accessToken: string | null,
): Promise<ApiWarehouse[]> {
  const res = await page.request.get(`${API_BASE}/warehouses`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  const body = (await res.json()) as ApiWarehouse[]
  return Array.isArray(body) ? body : []
}

export async function getStockForProduct(
  page: Page,
  accessToken: string | null,
  productId: string,
): Promise<ApiStockLevel[]> {
  const res = await page.request.get(`${API_BASE}/stock/product/${productId}`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  const body = (await res.json()) as { data?: ApiStockLevel[] } | ApiStockLevel[]
  return Array.isArray(body) ? body : (body.data ?? [])
}

/** Force the dashboard snapshot to run so seed data is created for a brand
 *  new user. Returns the shape the dashboard page expects. */
export async function primeDashboard(
  page: Page,
  accessToken: string | null,
): Promise<{
  totalUnits: number
  uniqueSkus: number
  warehouses: number
  lowStockCount: number
  outOfStockCount: number
  inventoryValueCents: number
  alerts: Array<{
    id: string
    productName: string
    sku: string
    quantity: number
    threshold: number
  }>
  movements: Array<{ id: string; productName: string; quantity: number }>
}> {
  const res = await page.request.get(`${API_BASE}/dashboard/snapshot`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  return (await res.json()) as Awaited<ReturnType<typeof primeDashboard>>
}

// ---------- catalog pickers ----------
//
// Specs read the product / warehouse / category they drive out of the API
// instead of naming one: the demo catalog is the first thing an app's owner
// replaces, and a spec that names a seeded row fails on a correct app.

export interface ApiWarehouseDetail extends ApiWarehouse {
  total_items: number
  unique_products: number
  stock_levels: ApiStockLevel[]
}

export interface ApiProductStock {
  product_id: string
  total_quantity: number
  by_warehouse: ApiStockLevel[]
}

export async function getWarehouse(
  page: Page,
  accessToken: string | null,
  warehouseId: string,
): Promise<ApiWarehouseDetail> {
  const res = await page.request.get(`${API_BASE}/warehouses/${warehouseId}`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  return (await res.json()) as ApiWarehouseDetail
}

export async function getProductStock(
  page: Page,
  accessToken: string | null,
  productId: string,
): Promise<ApiProductStock> {
  const res = await page.request.get(`${API_BASE}/stock/product/${productId}`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  return (await res.json()) as ApiProductStock
}

/** Units held across every warehouse — the same stock rows the dashboard
 *  snapshot sums, read back so a spec never hardcodes a seeded volume. */
export async function totalUnitsAcrossWarehouses(
  page: Page,
  accessToken: string | null,
  warehouses: ApiWarehouse[],
): Promise<number> {
  let total = 0
  for (const warehouse of warehouses) {
    const detail = await getWarehouse(page, accessToken, warehouse.id)
    total += Number(detail.total_items ?? 0)
  }
  return total
}

/** A product the catalog currently stocks somewhere. */
export async function pickStockedProduct(
  page: Page,
  accessToken: string | null,
): Promise<{ product: ApiProduct; stock: ApiProductStock }> {
  const products = await listProducts(page, accessToken)
  for (const product of products) {
    const stock = await getProductStock(page, accessToken, product.id)
    if (Number(stock.total_quantity) > 0) return { product, stock }
  }
  throw new Error('catalog needs at least one product with stock on hand')
}

/** A warehouse that still holds stock — what the "cannot delete a warehouse
 *  with stock" invariant needs, without naming a seeded warehouse. */
export async function pickWarehouseWithStock(
  page: Page,
  accessToken: string | null,
): Promise<ApiWarehouseDetail> {
  const warehouses = await listWarehouses(page, accessToken)
  for (const warehouse of warehouses) {
    const detail = await getWarehouse(page, accessToken, warehouse.id)
    if (detail.stock_levels.length > 0) return detail
  }
  throw new Error('catalog needs at least one warehouse holding stock')
}

/** A product with stock in one warehouse plus a second warehouse to move it
 *  to, and a quantity the source can actually spare. */
export async function pickTransferRoute(
  page: Page,
  accessToken: string | null,
): Promise<{
  product: ApiProduct
  from: ApiWarehouse
  to: ApiWarehouse
  quantity: number
}> {
  const warehouses = await listWarehouses(page, accessToken)
  if (warehouses.length < 2) throw new Error('moving stock needs two warehouses')
  const products = await listProducts(page, accessToken)
  for (const product of products) {
    const stock = await getProductStock(page, accessToken, product.id)
    const source = stock.by_warehouse.find((level) => Number(level.quantity) > 1)
    if (!source) continue
    const from = warehouses.find((w) => w.id === source.warehouse_id)
    const to = warehouses.find((w) => w.id !== source.warehouse_id)
    if (from && to) {
      return { product, from, to, quantity: Math.floor(Number(source.quantity) / 2) }
    }
  }
  throw new Error('catalog needs a product with stock in one of two warehouses')
}

/** The text the Inventory page searches over (`name sku category`). */
export function productHaystack(product: ApiProduct): string {
  return `${product.name} ${product.sku} ${product.category ?? 'Uncategorized'}`.toLowerCase()
}

/** A search term the catalog really contains, plus a product it must exclude —
 *  so "searching X finds X and not Y" still holds on a replaced catalog. */
export async function pickSearchTerm(
  page: Page,
  accessToken: string | null,
): Promise<{ target: ApiProduct; other: ApiProduct; term: string }> {
  const products = await listProducts(page, accessToken)
  for (const target of products) {
    for (const word of target.name.split(/\s+/).filter((w) => /^[a-z0-9]{4,}$/i.test(w))) {
      const other = products.find((p) => !productHaystack(p).includes(word.toLowerCase()))
      if (other) return { target, other, term: word }
    }
  }
  throw new Error('catalog needs two products with distinguishable names')
}

/** A category the Inventory page's filter really offers (its options are built
 *  from the product rows, so this must come from the catalog). */
export async function pickCategory(page: Page, accessToken: string | null): Promise<string> {
  const products = await listProducts(page, accessToken)
  const named = products.find((p) => p.category)
  if (named?.category) return String(named.category)
  if (products.length > 0) return 'Uncategorized'
  throw new Error('catalog is empty, so it offers no category to filter by')
}

/** Create a product and place a known quantity of it in a warehouse. Specs that
 *  need a specific stock condition build it through the API rather than relying
 *  on whichever rows the demo seed happens to create. */
export async function createProductWithStock(
  page: Page,
  accessToken: string | null,
  opts: { quantity: number; lowStockThreshold?: number },
): Promise<{ product: ApiProduct; warehouse: ApiWarehouse }> {
  const stamp = `${Date.now()}-${++counter}`
  const warehouses = await listWarehouses(page, accessToken)
  let warehouse = warehouses[0]
  if (!warehouse) {
    const res = await page.request.post(`${API_BASE}/warehouses`, {
      headers: authHeaders(accessToken),
      data: {
        name: `Spec Warehouse ${stamp}`,
        code: `SPEC-WH-${stamp}`,
        city: 'Specville',
        country: 'USA',
        capacity: 10_000,
      },
      failOnStatusCode: false,
    })
    expect(res.status(), await res.text().catch(() => '')).toBe(201)
    warehouse = (await res.json()) as ApiWarehouse
  }

  const productRes = await page.request.post(`${API_BASE}/products`, {
    headers: authHeaders(accessToken),
    data: {
      name: `Spec Product ${stamp}`,
      sku: `SPEC-${stamp}`,
      category: 'Spec',
      cost_price: 5,
      sell_price: 9,
      low_stock_threshold: opts.lowStockThreshold ?? 25,
    },
    failOnStatusCode: false,
  })
  expect(productRes.status(), await productRes.text().catch(() => '')).toBe(201)
  const product = (await productRes.json()) as ApiProduct

  if (opts.quantity > 0) {
    const adjust = await page.request.post(`${API_BASE}/stock/adjust`, {
      headers: authHeaders(accessToken),
      data: {
        product_id: product.id,
        warehouse_id: warehouse.id,
        quantity_change: opts.quantity,
        reason: 'spec-setup',
      },
      failOnStatusCode: false,
    })
    expect(adjust.status(), await adjust.text().catch(() => '')).toBe(200)
  }

  return { product, warehouse }
}
