/**
 * /open-shifts — the claim board: published unassigned shifts render,
 * a claim lands pending, and manager approval assigns the shift.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  claimShift,
  pickStaff,
  seedShift,
  signup,
} from './_helpers.js'

test.describe('open shifts page', () => {
  test('renders published unassigned shifts and fetches /api/open-shifts', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedShift(page, accessToken, { staff_id: null, notes: 'e2e open shift' })
    await page.goto(APP_BASE + '/open-shifts')
    await expect(page.getByRole('heading', { name: /open shifts/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^claim shift$/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('claim lands pending and approval assigns the shift', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await pickStaff(page, accessToken)
    const shift = await seedShift(page, accessToken, { staff_id: null })
    const claim = await claimShift(page, accessToken, shift.id, person.id)
    expect(claim.status).toBe('pending')
    const patch = await page.request.patch(`${API_BASE}/claims/${claim.id}`, {
      headers: apiHeaders(accessToken),
      data: { status: 'approved' },
    })
    expect(patch.status()).toBe(200)
    const after = (await (
      await page.request.get(`${API_BASE}/shifts/${shift.id}`, {
        headers: apiHeaders(accessToken),
      })
    ).json()) as { staff_id: string | null; assigned_via: string }
    expect(after.staff_id).toBe(person.id)
    expect(after.assigned_via).toBe('claim')
  })

  test('claiming an already-assigned shift 409s', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await pickStaff(page, accessToken)
    const shift = await seedShift(page, accessToken, { staff_id: person.id })
    const other = await pickStaff(page, accessToken, 1)
    const res = await page.request.post(`${API_BASE}/claims`, {
      headers: apiHeaders(accessToken),
      data: { shift_id: shift.id, staff_id: other.id },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(409)
  })

  test('the claim dialog posts a claim for the chosen person', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await pickStaff(page, accessToken)
    await seedShift(page, accessToken, { staff_id: null, notes: 'e2e dialog shift' })
    await page.goto(APP_BASE + '/open-shifts')
    await page
      .getByRole('button', { name: /^claim shift$/i })
      .first()
      .click()
    const select = page.locator('[data-mol-id="open-shift-claim-dialog"] select')
    await select.selectOption({ label: `${person.name} · ${person.role}` })
    await page.getByRole('button', { name: /^submit claim$/i }).click()
    await expect(page.getByText(/awaiting approval/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
