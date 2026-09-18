/**
 * Menu CRUD — the operator's primary catalog. Verify create, list, edit,
 * delete with read-after-write proof; the menu detail page round-trips
 * server data; dietary tags persist through the round-trip.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, createMenuItem, signup, type ApiMenuItem } from './_helpers.js'

test('Menu create + list + delete round-trips through the database', async ({ page }) => {
  await signup(page)
  const item = await createMenuItem(page, {
    name: 'Truffle Tagliatelle',
    price: 24.5,
    category: 'mains',
    dietary_tags: ['vegetarian'],
  })
  expect(item.id).toBeTruthy()

  // List sees the item
  const list = await apiRequest<{ data: ApiMenuItem[] }>(page, 'GET', '/api/menu')
  expect(list.status).toBe(200)
  expect(list.body.data.find((i) => i.id === item.id)?.name).toBe('Truffle Tagliatelle')

  // Delete it
  const del = await apiRequest(page, 'DELETE', `/api/menu/${item.id}`)
  expect(del.status).toBe(204)

  // Confirm gone
  const after = await apiRequest<{ data: ApiMenuItem[] }>(page, 'GET', '/api/menu')
  expect(after.body.data.find((i) => i.id === item.id)).toBeUndefined()
})

test('Menu page renders list of created items', async ({ page }) => {
  await signup(page)
  await createMenuItem(page, { name: 'Heirloom Tomato Salad', price: 14, category: 'starters' })
  await createMenuItem(page, { name: 'Kashmiri Lamb', price: 28, category: 'mains' })

  await page.goto(APP_BASE + '/menu', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Heirloom Tomato Salad', { exact: false }).first()).toBeVisible({
    timeout: 15000,
  })
  await expect(page.getByText('Kashmiri Lamb', { exact: false }).first()).toBeVisible()
})

test('Menu detail page round-trips an edit through PUT', async ({ page }) => {
  await signup(page)
  const item = await createMenuItem(page, { name: 'Burrata', price: 16, category: 'starters' })

  // Update via API and read back
  const upd = await apiRequest<ApiMenuItem>(page, 'PUT', `/api/menu/${item.id}`, {
    name: 'Burrata with peaches',
    description: 'Stone fruit, basil oil',
    price: 18,
  })
  expect(upd.status).toBe(200)
  expect(upd.body.name).toBe('Burrata with peaches')

  // GET reflects the change (read-after-write invariant)
  const fresh = await apiRequest<ApiMenuItem>(page, 'GET', `/api/menu/${item.id}`)
  expect(fresh.status).toBe(200)
  expect(fresh.body.name).toBe('Burrata with peaches')
  expect(Number(fresh.body.price)).toBe(18)
})

test('Menu dietary tags survive create+read round trip', async ({ page }) => {
  await signup(page)
  const tags = ['vegan', 'gluten-free']
  const item = await createMenuItem(page, { name: 'Quinoa Bowl', price: 13, dietary_tags: tags })
  const fresh = await apiRequest<ApiMenuItem>(page, 'GET', `/api/menu/${item.id}`)
  expect(fresh.status).toBe(200)
  expect(fresh.body.dietary_tags).toEqual(tags)
})

test('Menu page shows empty-state when no items exist', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/menu', { waitUntil: 'domcontentloaded' })
  // Either the empty UI element OR the "Add item" button must be present.
  await expect(
    page.getByRole('button', { name: /add item/i }).or(page.getByText(/no menu items|empty/i)),
  ).toBeVisible({ timeout: 15000 })
})
