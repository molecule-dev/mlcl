/**
 * Guest QR cart flow — unauthenticated guests submit orders that get
 * routed to the operator. Verify the customer record is created/found
 * and the order links to the operator + table by side effect.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiRequest,
  createMenuItem,
  createTable,
  getAccessToken,
  signup,
  signupApi,
  type ApiOrder,
} from './_helpers.js'

test('Guest order persists, attaches to customers, shows up in kitchen queue', async ({
  page,
  request,
}) => {
  await signup(page)
  // Capture owner identity for guest endpoint — [M1-1] token is in the
  // httpOnly cookie, not localStorage; read it via getAccessToken().
  const token = await getAccessToken(page)
  let ownerId = ''
  if (token) {
    try {
      ownerId = String(JSON.parse(atob(token.split('.')[1])).userId || '')
    } catch {
      /* ignore decode failure */
    }
  }
  expect(ownerId).toBeTruthy()

  const item = await createMenuItem(page, { name: 'Pão de Queijo', price: 6 })
  const t = await createTable(page, { table_number: 33, seats: 2 })

  // Guest POSTs without auth — must work via API
  const guestPost = await request.post('/api/guest/orders', {
    data: {
      owner_id: ownerId,
      table_number: t.table_number,
      customer_name: 'Tomás Souza',
      customer_email: 'tomas-' + Date.now() + '@test.local',
      items: [{ menu_item_id: item.id, quantity: 3 }],
    },
  })
  expect(guestPost.status()).toBe(201)
  const created = (await guestPost.json()) as { id: string; total: number }
  expect(created.id).toBeTruthy()
  expect(Number(created.total)).toBeCloseTo(18, 2)

  // The owner's kitchen queue now sees the order
  const kitchen = await apiRequest<{ data: ApiOrder[] }>(page, 'GET', '/api/kitchen')
  expect(kitchen.status).toBe(200)
  expect(kitchen.body.data.find((o) => o.id === created.id)).toBeTruthy()

  // The customer was created in the operator's directory
  const customers = await apiRequest<{ data: { name: string; email: string }[] }>(
    page,
    'GET',
    '/api/customers',
  )
  expect(customers.status).toBe(200)
  expect(customers.body.data.find((c) => c.name === 'Tomás Souza')).toBeTruthy()

  // The table is now occupied
  const tFresh = await apiRequest<{ status: string }>(page, 'GET', `/api/tables/${t.id}`)
  expect(tFresh.body.status).toBe('occupied')
})

test('Guest cart UI loads and accepts query params', async ({ page, request }) => {
  // Need an owner to anchor the guest cart's owner param
  const owner = await signupApi(request)
  await page.goto(`${APP_BASE}/menu/guest?owner=${owner.userId}&table=5`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForTimeout(500)
  // The guest menu page should show the menu UI; we accept any of the
  // page-level headings as proof it rendered.
  const heading = page.getByRole('heading').first()
  await expect(heading).toBeVisible({ timeout: 15000 })
})

test('Guest endpoint rejects orders with no valid items', async ({ request }) => {
  // owner_id required but unknown menu items → 400 "no valid items"
  const r = await request.post('/api/guest/orders', {
    data: {
      owner_id: '00000000-0000-0000-0000-000000000000',
      items: [{ menu_item_id: '00000000-0000-0000-0000-000000000000', quantity: 1 }],
    },
  })
  expect(r.status()).toBe(400)
})
