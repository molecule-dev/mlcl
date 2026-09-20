/**
 * /shifts/:id — assignment, swap/drop request form, and the approve/deny
 * actions (read-after-write through the API).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  pickStaff,
  seedShift,
  seedSwapRequest,
  signup,
  weekDate,
} from './_helpers.js'

test.describe('shift detail page', () => {
  test('renders the shift with role, times, and assignment', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await pickStaff(page, accessToken)
    const shift = await seedShift(page, accessToken, {
      staff_id: person.id,
      role: 'Shift Lead',
      date: weekDate(0, 2),
    })
    await page.goto(APP_BASE + `/shifts/${shift.id}`)
    await expect(page.getByRole('heading', { name: /shift lead shift/i })).toBeVisible()
    await expect(page.getByText(person.name).first()).toBeVisible()
    await expect(page.getByText(/10:00–18:00/).first()).toBeVisible()
  })

  test('request drop → approve → shift reopens (staff_id null)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await pickStaff(page, accessToken)
    const shift = await seedShift(page, accessToken, { staff_id: person.id })
    const request = await seedSwapRequest(page, accessToken, {
      from_shift: shift.id,
      requester_staff_id: person.id,
      kind: 'drop',
    })
    expect(request.status).toBe('pending')
    const patch = await page.request.patch(`${API_BASE}/swap-requests/${request.id}`, {
      headers: apiHeaders(accessToken),
      data: { status: 'approved' },
    })
    expect(patch.status()).toBe(200)
    const after = await page.request.get(`${API_BASE}/shifts/${shift.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await after.json()) as { staff_id: string | null; is_open: boolean }
    expect(body.staff_id).toBeNull()
    expect(body.is_open).toBe(true)
  })

  test('request swap → approve → assignment moves to the target atomically', async ({ page }) => {
    const { accessToken } = await signup(page)
    const from = await pickStaff(page, accessToken)
    const to = await pickStaff(page, accessToken, 1)
    const shift = await seedShift(page, accessToken, { staff_id: from.id })
    const request = await seedSwapRequest(page, accessToken, {
      from_shift: shift.id,
      requester_staff_id: from.id,
      kind: 'swap',
      target_staff_id: to.id,
    })
    const patch = await page.request.patch(`${API_BASE}/swap-requests/${request.id}`, {
      headers: apiHeaders(accessToken),
      data: { status: 'approved' },
    })
    expect(patch.status()).toBe(200)
    const after = (await (
      await page.request.get(`${API_BASE}/shifts/${shift.id}`, {
        headers: apiHeaders(accessToken),
      })
    ).json()) as { staff_id: string; assigned_via: string }
    expect(after.staff_id).toBe(to.id)
    expect(after.assigned_via).toBe('swap')
  })

  test('detail page exposes the approve/deny actions for a pending request', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await pickStaff(page, accessToken)
    const shift = await seedShift(page, accessToken, { staff_id: person.id })
    await seedSwapRequest(page, accessToken, {
      from_shift: shift.id,
      requester_staff_id: person.id,
      kind: 'drop',
      note: 'e2e visible request',
    })
    await page.goto(APP_BASE + `/shifts/${shift.id}`)
    await expect(page.getByRole('button', { name: /^approve$/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^deny$/i }).first()).toBeVisible()
  })
})
