// Test helpers for the food-delivery template e2e suite.
//
// Every spec imports from here rather than rewriting auth / API / network
// plumbing. The food-delivery signup/login forms use `id` attributes
// (#email/#password/#name) instead of `name`, so we hit the inputs by id.

import { type Page, expect } from '@molecule/app-e2e-fixtures-default'

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

/**
 * Whether a restaurant is open right now, mirroring the API's own rule.
 *
 * Deliberately permissive about shape: a restaurant with no hours (every
 * merchant-owned one created by these specs) is treated as open, exactly as
 * `isOpenNow` in api/src/handlers/_hours.ts returns null → not-closed.
 *
 * @param openingHours - The row's opening_hours, JSON string or object.
 * @returns True when an order placed now would be accepted.
 */
function isOpenNow(openingHours: unknown): boolean {
  let hours: Record<string, unknown> | null = null
  if (typeof openingHours === 'string') {
    try {
      hours = JSON.parse(openingHours) as Record<string, unknown>
    } catch {
      return true
    }
  } else if (openingHours && typeof openingHours === 'object') {
    hours = openingHours as Record<string, unknown>
  }
  if (!hours) return true
  const now = new Date()
  const window = hours[DAY_KEYS[now.getDay()]]
  if (typeof window !== 'string' || !window.includes('-')) return true
  const [open, close] = window.split('-')
  const mins = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return Number.isNaN(h) || Number.isNaN(m) ? NaN : h * 60 + m
  }
  const o = mins(open)
  const c = mins(close)
  if (Number.isNaN(o) || Number.isNaN(c)) return true
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return c >= o ? nowMin >= o && nowMin <= c : nowMin >= o || nowMin <= c
}

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

/** An address these specs own. Deliberately not one of the seeded addresses —
 *  a spec that reuses demo content breaks when the demo content is replaced. */
export const SPEC_DELIVERY_ADDRESS = '1 Spec Lane, Testville'

let counter = 0
export function uniqueEmail(prefix = 'foodie') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Sign up a fresh user via the UI. Returns the credentials.
 *
 * Deterministic gating: arm POST /api/users BEFORE the click (so a fast
 * response can't be missed), assert < 400, wait for nav off /signup,
 * then poll until the JWT lands in localStorage. Without the explicit
 * token-poll, specs that fire page.request.* immediately after signup()
 * sometimes read a stale empty token because React routes the moment
 * POST resolves but the auth-state hook persists the JWT in a
 * subsequent microtask → 401 → "API-only" flake. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('#name').fill('Test Foodie')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  const submit = page.locator('button[type="submit"]')
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\b|\?|$)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  const submit = page.locator('button[type="submit"]')
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20_000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
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

/** Open the user menu (header avatar) and click Log out in SettingsPanel. */
export async function logout(page: Page) {
  await page
    .getByRole('button', { name: /open\s*user\s*menu|user|profile|menu|account/i })
    .first()
    .click()
  await page
    .getByRole('button', { name: /log\s*out|sign\s*out/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
}

/** Fetch the seeded restaurant catalog through the public API. */
export async function getRestaurants(page: Page) {
  const resp = await page.request.get(API_BASE + '/restaurants')
  if (resp.status() !== 200) {
    throw new Error(`GET /api/restaurants failed: ${resp.status()} ${await resp.text()}`)
  }
  const body = await resp.json()
  return body?.data ?? []
}

/** Fetch the menu for a specific restaurant. Returns flat list of items. */
export async function getMenu(page: Page, restaurantId: string) {
  const resp = await page.request.get(API_BASE + '/menu/restaurant/' + restaurantId)
  if (resp.status() !== 200) {
    throw new Error(
      `GET /api/menu/restaurant/${restaurantId} failed: ${resp.status()} ${await resp.text()}`,
    )
  }
  const body = await resp.json()
  // Endpoint returns { data: { restaurant, items, categories } } — return items.
  const data = body?.data
  if (Array.isArray(data)) return data
  return data?.items ?? []
}

/** A catalog row, in the shape the restaurant pages read. */
export interface CatalogRestaurant {
  id: string
  name: string
  category?: string
  cuisine?: string
  opening_hours?: unknown
  latitude?: unknown
  longitude?: unknown
}

/** The key the Restaurants page filters on (`category`, falling back to `cuisine`). */
export function categoryOf(restaurant: CatalogRestaurant): string {
  return String(restaurant.category ?? restaurant.cuisine ?? '')
}

/** A restaurant from the live catalog — whichever one the app actually holds. */
export async function pickRestaurant(page: Page): Promise<CatalogRestaurant> {
  const catalog = (await getRestaurants(page)) as CatalogRestaurant[]
  const first = catalog[0]
  if (!first) throw new Error('catalog is empty')
  return first
}

/**
 * A restaurant from the live catalog that is open right now.
 *
 * Specs read the restaurant they drive out of the API instead of naming one:
 * the demo catalog is the first thing an app's owner replaces, and a spec that
 * names a seeded row fails on a correct app. `POST /api/orders` rejects a
 * closed restaurant, so order flows need an open one specifically.
 */
export async function pickOpenRestaurant(page: Page): Promise<CatalogRestaurant> {
  const catalog = (await getRestaurants(page)) as CatalogRestaurant[]
  const open = catalog.find((r) => isOpenNow(r.opening_hours))
  if (!open) throw new Error('catalog has no restaurant open right now')
  return open
}

/**
 * Two catalog restaurants in different categories — what the filter, search and
 * switch-restaurants specs need. Throws when the catalog cannot express the
 * behaviour under test rather than asserting on a particular row.
 */
export async function pickTwoCategories(
  page: Page,
): Promise<{ target: CatalogRestaurant; other: CatalogRestaurant }> {
  const catalog = (await getRestaurants(page)) as CatalogRestaurant[]
  for (const target of catalog) {
    const other = catalog.find((r) => categoryOf(r) !== categoryOf(target))
    if (other) return { target, other }
  }
  throw new Error('catalog needs restaurants in two different categories')
}

/**
 * Two catalog restaurants whose names are unambiguous for a text search —
 * neither name contains the other, so searching one must exclude the other.
 */
export async function pickTwoDistinctNames(
  page: Page,
): Promise<{ target: CatalogRestaurant; other: CatalogRestaurant }> {
  const catalog = (await getRestaurants(page)) as CatalogRestaurant[]
  const disjoint = (a: string, b: string) =>
    !a.toLowerCase().includes(b.toLowerCase()) && !b.toLowerCase().includes(a.toLowerCase())
  for (const target of catalog) {
    const other = catalog.find((r) => r.id !== target.id && disjoint(r.name, target.name))
    if (other) return { target, other }
  }
  throw new Error('catalog needs two restaurants with distinguishable names')
}

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: {
    request: () => { method: () => string }
    url: () => string
    status: () => number
  }) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp as never)
  try {
    await fn()
  } finally {
    page.off('response', onResp as never)
  }
  return reqs
}

/**
 * Create a restaurant + one available menu item owned by the currently
 * signed-in user (the MERCHANT). Returns ids needed to place + drive an order.
 *
 * No geocoding key in CI → the new restaurant's lat/lng stay null (treated as
 * 0,0 by the order endpoint), so place orders with `placeOrderAtOwnedRestaurant`
 * (delivery coords 0,0 → distance 0 → always accepted).
 */
export async function createOwnedRestaurant(page: Page, name = 'Merchant Diner') {
  const rResp = await page.request.post(API_BASE + '/restaurants', {
    data: { name, address: '1 Test Plaza, Springfield', minimum_order: 0 },
  })
  if (![200, 201].includes(rResp.status())) {
    throw new Error(`POST /api/restaurants failed: ${rResp.status()} ${await rResp.text()}`)
  }
  const rBody = await rResp.json()
  const restaurant = (rBody?.data ?? rBody) as { id: string }
  const mResp = await page.request.post(API_BASE + '/menu', {
    data: { restaurant_id: restaurant.id, name: 'House Special', price: 12.5, category: 'Main' },
  })
  if (![200, 201].includes(mResp.status())) {
    throw new Error(`POST /api/menu failed: ${mResp.status()} ${await mResp.text()}`)
  }
  const mBody = await mResp.json()
  const menuItem = (mBody?.data ?? mBody) as { id: string }
  return { restaurantId: restaurant.id, menuItemId: menuItem.id }
}

/**
 * Place an order at a (possibly null-coord) merchant-owned restaurant for the
 * signed-in buyer. Uses delivery coords 0,0 so distance == 0 and the order is
 * accepted regardless of geocoding. Returns the order.
 */
export async function placeOrderAtOwnedRestaurant(
  page: Page,
  restaurantId: string,
  menuItemId: string,
) {
  const resp = await page.request.post(API_BASE + '/orders', {
    data: {
      restaurant_id: restaurantId,
      items: [{ menu_item_id: menuItemId, quantity: 2 }],
      delivery_address: SPEC_DELIVERY_ADDRESS,
      delivery_lat: 0,
      delivery_lng: 0,
    },
  })
  if (![200, 201].includes(resp.status())) {
    throw new Error(`POST /api/orders failed: ${resp.status()} ${await resp.text()}`)
  }
  const body = await resp.json()
  return body?.data ?? body
}

/** Place a minimal valid order via API for the signed-in user. Returns the order. */
export async function placeOrderViaApi(
  page: Page,
  opts?: { restaurantId?: string; quantity?: number },
) {
  const restaurants = await getRestaurants(page)
  // The order endpoint computes the great-circle distance between the
  // restaurant's stored coordinates and the delivery coordinates, rejecting
  // anything outside DELIVERY_RADIUS_KM. We must therefore order from a
  // restaurant that actually has real coordinates AND deliver to those same
  // coordinates (distance == 0 → a legitimately in-area order).
  //
  // Earlier specs (04-orders-tracking) create merchant-owned restaurants via
  // POST /api/restaurants; with no geocoding key in CI those rows persist with
  // NULL latitude/longitude and, being the newest, sort first in
  // GET /api/restaurants (created_at DESC). The seeded catalog restaurants
  // always carry real coordinates. So when no specific
  // restaurant is requested, skip any coordinate-less row and pick a seeded one
  // — otherwise the helper would deliver to its own fallback coords while the
  // handler measured from the restaurant's (0,0) default → ~12,795 km → 400
  // "outside the delivery area".
  const hasRealCoords = (r: { latitude?: unknown; longitude?: unknown }) =>
    Number(r.latitude ?? 0) !== 0 && Number(r.longitude ?? 0) !== 0
  // …and one that is OPEN. POST /orders 400s a closed restaurant, and every
  // seeded restaurant but one keeps daytime hours — so picking purely on
  // coordinates made this helper, and the four specs built on it, pass by day
  // and fail at 4am. The seed carries a 24-hour restaurant precisely so there
  // is always a valid choice; falling back to `hasRealCoords` alone keeps the
  // helper working against a catalog that does not.
  const restaurant = opts?.restaurantId
    ? restaurants.find((r: { id: string }) => r.id === opts.restaurantId)
    : (restaurants.find((r: CatalogRestaurant) => hasRealCoords(r) && isOpenNow(r.opening_hours)) ??
      restaurants.find(hasRealCoords) ??
      restaurants[0])
  if (!restaurant) throw new Error('no restaurants available')

  const menu = await getMenu(page, restaurant.id)
  if (!menu.length) throw new Error(`no menu items for restaurant ${restaurant.id}`)
  const item = menu[0]
  const unitPriceCents = Number(item.price_cents ?? item.price ?? 0)
  // Bump quantity to clear the minimum-order threshold (in cents).
  const minimumOrderCents = Number(restaurant.minimum_order_cents ?? restaurant.minimum_order ?? 0)
  const desiredQty =
    opts?.quantity ?? Math.max(2, Math.ceil(minimumOrderCents / Math.max(unitPriceCents, 1)))

  // Deliver to the restaurant's own coordinates so distance == 0 and the order
  // is always accepted. Mirror the handler's own `?? 0` defaulting so the two
  // sides agree even for the (coordinate-less) merchant-owned fallback case.
  const lat = Number(restaurant.latitude ?? 0)
  const lng = Number(restaurant.longitude ?? 0)

  const resp = await page.request.post(API_BASE + '/orders', {
    data: {
      restaurant_id: restaurant.id,
      items: [{ menu_item_id: item.id, quantity: desiredQty }],
      delivery_address: SPEC_DELIVERY_ADDRESS,
      delivery_lat: lat,
      delivery_lng: lng,
    },
  })
  if (![200, 201].includes(resp.status())) {
    throw new Error(`POST /api/orders failed: ${resp.status()} ${await resp.text()}`)
  }
  const body = await resp.json()
  return { restaurant, item, order: body?.data ?? body }
}
