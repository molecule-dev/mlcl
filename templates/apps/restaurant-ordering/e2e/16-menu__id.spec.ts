/**
 * Menu item detail page — edit form for an existing menu row. Verifies
 * load, persist round-trip (read-after-write), availability toggle, and
 * 404-on-bad-id handling.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, createMenuItem, signup } from './_helpers.js'

test('Menu item detail loads an existing item into the form', async ({ page }) => {
  await signup(page)
  const item = await createMenuItem(page, {
    name: 'Margherita',
    price: 14.5,
    description: 'fresh basil',
  })
  await page.goto(APP_BASE + `/menu/${item.id}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Margherita', exact: true })).toBeVisible({
    timeout: 15000,
  })
  await expect(page.getByRole('textbox', { name: 'Item name' })).toHaveValue('Margherita')
  await expect(page.getByRole('textbox', { name: 'Price (USD)' })).toHaveValue('14.50')
})

test('Menu item detail: PUT /api/menu/:id round-trips through GET', async ({ page }) => {
  await signup(page)
  const item = await createMenuItem(page, { name: 'Carbonara', price: 18 })
  const upd = await apiRequest(page, 'PUT', `/api/menu/${item.id}`, {
    name: 'Carbonara Royale',
    price: 19.5,
  })
  expect([200, 204]).toContain(upd.status)
  const after = await apiRequest<{ name: string; price: string | number }>(
    page,
    'GET',
    `/api/menu/${item.id}`,
  )
  expect(after.body.name).toBe('Carbonara Royale')
  expect(Number(after.body.price)).toBeCloseTo(19.5, 2)
})

test('Menu item detail: 404 path does not crash the page', async ({ page }) => {
  await signup(page)
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(APP_BASE + '/menu/00000000-0000-0000-0000-000000000000', {
    waitUntil: 'domcontentloaded',
  })
  // Page should render either an error or the not-found state — and NOT throw.
  expect(errs.filter((e) => !/network/i.test(e))).toEqual([])
})

test('Menu item detail: toggling availability persists across reload', async ({ page }) => {
  await signup(page)
  const item = await createMenuItem(page, { name: 'Pavlova', price: 9 })
  expect(item.available).toBe(true)

  const off = await apiRequest(page, 'PUT', `/api/menu/${item.id}`, { available: false })
  expect([200, 204]).toContain(off.status)

  const after = await apiRequest<{ available: boolean }>(page, 'GET', `/api/menu/${item.id}`)
  expect(after.body.available).toBe(false)
})

test('Menu item detail: deletion removes the row from /api/menu list', async ({ page }) => {
  await signup(page)
  const item = await createMenuItem(page, { name: 'Disposable Tartine', price: 7 })
  const del = await apiRequest(page, 'DELETE', `/api/menu/${item.id}`)
  expect([200, 204]).toContain(del.status)

  const list = await apiRequest<{ data: Array<{ id: string }> }>(page, 'GET', '/api/menu?limit=200')
  expect(list.body.data.find((r) => r.id === item.id)).toBeFalsy()
})

test('Menu item detail: availability Switch flips and persists through save', async ({ page }) => {
  await signup(page)
  const item = await createMenuItem(page, { name: 'Switch Cake', price: 8 })
  await page.goto(APP_BASE + `/menu/${item.id}`, { waitUntil: 'domcontentloaded' })

  const sw = page.getByTestId('menuitem-available')
  await expect(sw).toBeVisible({ timeout: 15000 })
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'false')

  await page.getByTestId('menuitem-save').click()
  await expect(page.getByTestId('menuitem-status')).toBeVisible({ timeout: 15000 })

  const fresh = await apiRequest<{ available: boolean }>(page, 'GET', `/api/menu/${item.id}`)
  expect(fresh.status).toBe(200)
  expect(fresh.body.available).toBe(false)
})

test('Menu item detail: two-click ConfirmButton arms then deletes the item', async ({ page }) => {
  await signup(page)
  const item = await createMenuItem(page, { name: 'Confirm Tart', price: 6 })
  await page.goto(APP_BASE + `/menu/${item.id}`, { waitUntil: 'domcontentloaded' })

  const del = page.getByTestId('menuitem-delete')
  await expect(del).toBeVisible({ timeout: 15000 })
  await expect(del).toHaveText(/delete item/i)

  // Arm, assert the confirm label, then commit.
  await del.click()
  await expect(del).toHaveText(/delete this menu item\?/i)
  await del.click()

  await expect(page).toHaveURL(/\/menu\/?$/, { timeout: 15000 })
  const list = await apiRequest<{ data: Array<{ id: string }> }>(page, 'GET', '/api/menu?limit=200')
  expect(list.body.data.find((r) => r.id === item.id)).toBeFalsy()
})
