/**
 * Table detail page — single-table view used to change status, see active
 * orders, print the QR, and delete the table. Verifies the page loads, the
 * status PUT round-trips, the QR endpoint returns a printable URL with
 * owner_id, and a deleted table no longer appears in the list.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, createTable, signup } from './_helpers.js'

test('Table detail page renders the table number and seats', async ({ page }) => {
  await signup(page)
  const t = await createTable(page, { table_number: 33, seats: 6 })
  await page.goto(APP_BASE + `/tables/${t.id}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/table\s*33/i).first()).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(/6/).first()).toBeVisible()
})

test('Table detail: status change PUT round-trips', async ({ page }) => {
  await signup(page)
  const t = await createTable(page, { table_number: 22, seats: 2 })
  const upd = await apiRequest(page, 'PUT', `/api/tables/${t.id}/status`, { status: 'occupied' })
  expect(upd.status).toBe(200)
  const after = await apiRequest<{ status: string }>(page, 'GET', `/api/tables/${t.id}`)
  expect(after.body.status).toBe('occupied')
})

test('Table detail: QR endpoint returns owner-scoped printable URL', async ({ page }) => {
  const { userId } = await signup(page)
  const t = await createTable(page, { table_number: 44, seats: 3 })
  const qr = await apiRequest<{ url: string; owner_id: string; table_number: number }>(
    page,
    'GET',
    `/api/tables/${t.id}/qr`,
  )
  expect(qr.status).toBe(200)
  expect(qr.body.owner_id).toBe(userId)
  expect(qr.body.url).toContain('table=44')
  expect(qr.body.url).toContain(`owner=${userId}`)
})

test('Table detail: delete removes the row from /api/tables', async ({ page }) => {
  await signup(page)
  const t = await createTable(page, { table_number: 99, seats: 4 })
  const del = await apiRequest(page, 'DELETE', `/api/tables/${t.id}`)
  expect([200, 204]).toContain(del.status)
  const list = await apiRequest<{ data: Array<{ id: string }> }>(page, 'GET', '/api/tables')
  expect(list.body.data.find((r) => r.id === t.id)).toBeFalsy()
})

test('Table detail: two-click ConfirmButton arms then deletes the table', async ({ page }) => {
  await signup(page)
  const t = await createTable(page, { table_number: 77, seats: 2 })
  await page.goto(APP_BASE + `/tables/${t.id}`, { waitUntil: 'domcontentloaded' })

  const del = page.getByTestId('tabledetail-delete')
  await expect(del).toBeVisible({ timeout: 15000 })
  await expect(del).toHaveText('Delete')

  // First click ARMS the button (no delete fires); the SAME element now
  // shows the confirm label — the replacement for the old window.confirm.
  await del.click()
  await expect(del).toHaveText(/delete this table\?/i)

  // Second click commits.
  await del.click()
  await expect(page).toHaveURL(/\/tables\/?$/, { timeout: 15000 })
  const list = await apiRequest<{ data: Array<{ id: string }> }>(page, 'GET', '/api/tables')
  expect(list.body.data.find((r) => r.id === t.id)).toBeFalsy()
})
