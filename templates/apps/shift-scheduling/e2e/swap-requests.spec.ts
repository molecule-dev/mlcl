/**
 * /swap-requests — mine + incoming lists render, the view-as picker
 * filters, and approve/deny drive the request lifecycle.
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
} from './_helpers.js'

test.describe('swap requests page', () => {
  test('pending requests render with approve/deny actions', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await pickStaff(page, accessToken)
    const shift = await seedShift(page, accessToken, { staff_id: person.id })
    await seedSwapRequest(page, accessToken, {
      from_shift: shift.id,
      requester_staff_id: person.id,
      kind: 'drop',
      note: 'e2e visible drop',
    })
    await page.goto(APP_BASE + '/swap-requests')
    await expect(page.getByRole('heading', { name: /swap requests/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^approve$/i }).first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('button', { name: /^deny$/i }).first()).toBeVisible()
  })

  test('view-as splits the list into my requests and incoming', async ({ page }) => {
    const { accessToken } = await signup(page)
    const from = await pickStaff(page, accessToken)
    const to = await pickStaff(page, accessToken, 1)
    const shift = await seedShift(page, accessToken, { staff_id: from.id })
    await seedSwapRequest(page, accessToken, {
      from_shift: shift.id,
      requester_staff_id: from.id,
      kind: 'swap',
      target_staff_id: to.id,
      note: 'e2e split request',
    })
    await page.goto(APP_BASE + '/swap-requests')
    const viewAs = page.locator('[data-mol-id="swap-requests-view-as"]')
    await viewAs.selectOption({ label: to.name })
    await expect(page.getByRole('heading', { name: /^my requests$/i })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(to.name).first()).toBeVisible()
  })

  test('deny leaves the shift assigned to the requester', async ({ page }) => {
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
      data: { status: 'denied' },
    })
    expect(patch.status()).toBe(200)
    const after = (await (
      await page.request.get(`${API_BASE}/shifts/${shift.id}`, {
        headers: apiHeaders(accessToken),
      })
    ).json()) as { staff_id: string }
    expect(after.staff_id).toBe(from.id)
  })
})
