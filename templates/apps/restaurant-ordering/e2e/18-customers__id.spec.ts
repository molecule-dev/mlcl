/**
 * Customer detail — single guest record. Verifies the page loads with the
 * stored fields, edits round-trip, and deletion removes the row.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, signup } from './_helpers.js'

interface ApiCustomer {
  id: string
  name: string
  email: string | null
  phone?: string | null
}

test('Customer detail page renders the stored fields', async ({ page }) => {
  await signup(page)
  const c = await apiRequest<ApiCustomer>(page, 'POST', '/api/customers', {
    name: 'Olive Tanaka',
    email: 'olive@test.local',
    phone: '+1-555-0199',
  })
  expect(c.status).toBe(201)
  await page.goto(APP_BASE + `/customers/${c.body.id}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Olive Tanaka').first()).toBeVisible({ timeout: 15000 })
})

test('Customer detail: PUT /api/customers/:id round-trips through GET', async ({ page }) => {
  await signup(page)
  const c = await apiRequest<ApiCustomer>(page, 'POST', '/api/customers', {
    name: 'Patrick Bel',
    email: 'patrick@test.local',
  })
  const upd = await apiRequest(page, 'PUT', `/api/customers/${c.body.id}`, {
    name: 'Patrick Bell',
    phone: '+1-555-0142',
  })
  expect([200, 204]).toContain(upd.status)
  const after = await apiRequest<ApiCustomer>(page, 'GET', `/api/customers/${c.body.id}`)
  expect(after.body.name).toBe('Patrick Bell')
  expect(after.body.phone).toBe('+1-555-0142')
})

test('Customer detail: deletion removes the row from /api/customers', async ({ page }) => {
  await signup(page)
  const c = await apiRequest<ApiCustomer>(page, 'POST', '/api/customers', {
    name: 'Temporary Guest',
    email: `tmp-${Date.now()}@test.local`,
  })
  const del = await apiRequest(page, 'DELETE', `/api/customers/${c.body.id}`)
  expect([200, 204]).toContain(del.status)
  const list = await apiRequest<{ data: ApiCustomer[] }>(page, 'GET', '/api/customers')
  expect(list.body.data.find((r) => r.id === c.body.id)).toBeFalsy()
})

test('Customer detail: 404 on bogus id does not crash the page', async ({ page }) => {
  await signup(page)
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(APP_BASE + '/customers/00000000-0000-0000-0000-000000000000', {
    waitUntil: 'domcontentloaded',
  })
  expect(errs.filter((e) => !/network/i.test(e))).toEqual([])
})
