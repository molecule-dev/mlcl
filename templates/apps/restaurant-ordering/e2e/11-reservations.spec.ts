/**
 * Reservations — bookings ledger. Verify the lifecycle (confirmed →
 * seated → cancelled), owner-scoped queries, and the table side-effect
 * when a reservation is seated.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, createTable, signup } from './_helpers.js'

interface ApiReservation {
  id: string
  party_size: number
  scheduled_for: string
  status: 'confirmed' | 'seated' | 'waitlist' | 'cancelled' | 'no_show'
  notes?: string | null
  table_id?: string | null
}

test('Reservations: create + list + status seated', async ({ page }) => {
  await signup(page)
  const t = await createTable(page, { table_number: 88, seats: 4 })
  const future = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  const res = await apiRequest<ApiReservation>(page, 'POST', '/api/reservations', {
    party_name: 'Garcia Family',
    party_size: 4,
    scheduled_for: future,
    notes: 'window seat',
    table_id: t.id,
  })
  expect(res.status).toBe(201)
  expect(res.body.party_size).toBe(4)
  expect(res.body.notes).toMatch(/Garcia Family/)

  const list = await apiRequest<{ data: ApiReservation[] }>(page, 'GET', '/api/reservations')
  expect(list.status).toBe(200)
  expect(list.body.data.find((r) => r.id === res.body.id)).toBeTruthy()

  const seated = await apiRequest<ApiReservation>(
    page,
    'PUT',
    `/api/reservations/${res.body.id}/status`,
    { status: 'seated' },
  )
  expect(seated.status).toBe(200)
  expect(seated.body.status).toBe('seated')

  const table = await apiRequest<{ status: string }>(page, 'GET', `/api/tables/${t.id}`)
  expect(table.body.status).toBe('reserved')
})

test('Reservations page renders bookings', async ({ page }) => {
  await signup(page)
  const future = new Date(Date.now() + 3 * 3600 * 1000).toISOString()
  await apiRequest(page, 'POST', '/api/reservations', {
    party_name: 'Wong + 2',
    party_size: 3,
    scheduled_for: future,
  })
  await page.goto(APP_BASE + '/reservations', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Wong + 2').first()).toBeVisible({ timeout: 15000 })
})

test('Reservations: cancellation persists across reload', async ({ page }) => {
  await signup(page)
  const future = new Date(Date.now() + 6 * 3600 * 1000).toISOString()
  const res = await apiRequest<ApiReservation>(page, 'POST', '/api/reservations', {
    party_name: 'Cancel Family',
    party_size: 2,
    scheduled_for: future,
  })
  const cancel = await apiRequest<ApiReservation>(
    page,
    'PUT',
    `/api/reservations/${res.body.id}/status`,
    {
      status: 'cancelled',
    },
  )
  expect(cancel.body.status).toBe('cancelled')

  const reload = await apiRequest<ApiReservation>(page, 'GET', `/api/reservations/${res.body.id}`)
  expect(reload.body.status).toBe('cancelled')
})

test('Reservations: status filter narrows results', async ({ page }) => {
  await signup(page)
  const future = new Date(Date.now() + 6 * 3600 * 1000).toISOString()
  const a = await apiRequest<ApiReservation>(page, 'POST', '/api/reservations', {
    party_name: 'Confirmed party',
    party_size: 2,
    scheduled_for: future,
  })
  const b = await apiRequest<ApiReservation>(page, 'POST', '/api/reservations', {
    party_name: 'Waitlist party',
    party_size: 6,
    scheduled_for: future,
  })
  await apiRequest(page, 'PUT', `/api/reservations/${b.body.id}/status`, { status: 'waitlist' })

  const confirmed = await apiRequest<{ data: ApiReservation[] }>(
    page,
    'GET',
    '/api/reservations?status=confirmed',
  )
  expect(confirmed.body.data.find((r) => r.id === a.body.id)).toBeTruthy()
  expect(confirmed.body.data.find((r) => r.id === b.body.id)).toBeFalsy()
})

test('Reservations: new-booking flow walks name → size → time through PromptDialog', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/reservations', { waitUntil: 'domcontentloaded' })

  await page.getByTestId('reservations-add').click()

  // Step 1 — party name (required).
  const nameInput = page.locator('[data-mol-id="reservations-add-name-input"]')
  await expect(nameInput).toBeVisible({ timeout: 15000 })
  await nameInput.fill('Prompt Party')
  await page.locator('[data-mol-id="reservations-add-name-confirm"]').click()

  // Step 2 — party size; an invalid value keeps the dialog open with an error.
  const sizeInput = page.locator('[data-mol-id="reservations-add-size-input"]')
  await expect(sizeInput).toBeVisible()
  await sizeInput.fill('0')
  await page.locator('[data-mol-id="reservations-add-size-confirm"]').click()
  await expect(page.locator('[role="alert"]').first()).toBeVisible()
  await expect(sizeInput).toBeVisible()

  await sizeInput.fill('5')
  await page.locator('[data-mol-id="reservations-add-size-confirm"]').click()

  // Step 3 — when; blank means "now".
  const whenInput = page.locator('[data-mol-id="reservations-add-when-input"]')
  await expect(whenInput).toBeVisible()
  await whenInput.fill(new Date(Date.now() + 3600_000).toISOString())
  await page.locator('[data-mol-id="reservations-add-when-confirm"]').click()

  // Post-commit outcome: the row renders AND the API has it (read-after-write).
  await expect(page.getByText('Prompt Party').first()).toBeVisible({ timeout: 15000 })
  const list = await apiRequest<{ data: ApiReservation[] }>(page, 'GET', '/api/reservations')
  const created = list.body.data.find((r) => (r.notes ?? '').includes('Prompt Party'))
  expect(created, 'reservation created through the dialogs must reach the API').toBeTruthy()
  expect(created?.party_size).toBe(5)
})
