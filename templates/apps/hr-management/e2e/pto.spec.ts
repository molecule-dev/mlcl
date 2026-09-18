/**
 * /pto — request form, approve / deny actions, list re-renders after
 * status changes.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedEmployee,
  seedPto,
  signup,
} from './_helpers.js'

test.describe('pto page', () => {
  test('pending requests render and initial mount fetches /api/pto', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Create the pending request through the same POST /api/pto the request
    // form uses, so the row under test does not depend on the demo data.
    const employee = await seedEmployee(page, accessToken)
    const pending = await seedPto(page, accessToken, { employee_id: employee.id })
    expect(pending.status).toBe('pending')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pto')
      await expect(page.getByRole('button', { name: /^approve$/i }).first()).toBeVisible()
    })
    expect(reqs.find((r) => /\/api\/pto(?:\?|$)/.test(r.url) && r.method === 'GET')).toBeTruthy()
    await expect(page.getByRole('button', { name: /^deny$/i }).first()).toBeVisible()
  })

  test('Approve flips a pending request to approved (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const emp = await seedEmployee(page, accessToken)
    const pto = await seedPto(page, accessToken, { employee_id: emp.id })
    expect(pto.status).toBe('pending')
    const patch = await page.request.patch(`${API_BASE}/pto/${pto.id}`, {
      headers: apiHeaders(accessToken),
      data: { status: 'approved' },
    })
    expect(patch.status()).toBe(200)
    const after = await page.request.get(`${API_BASE}/pto/${pto.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await after.json()) as { status: string }
    expect(body.status).toBe('approved')
  })

  test('Request time off form posts to /api/pto and the new row appears', async ({ page }) => {
    const { accessToken } = await signup(page)
    const emp = await seedEmployee(page, accessToken, {
      first_name: 'Para',
      last_name: 'Tooly',
    })
    await page.goto(APP_BASE + '/pto')
    await page.getByRole('button', { name: /request time off/i }).click()
    // Pick the seeded employee from the dropdown using the visible "Para Tooly" option.
    const employeeSelect = page.locator('select').first()
    await employeeSelect.selectOption({ label: 'Para Tooly' })
    await page.locator('input[type="date"]').first().fill('2026-07-01')
    await page.locator('input[type="date"]').nth(1).fill('2026-07-05')
    await page.getByRole('button', { name: /^submit request$/i }).click()
    // Refresh after submit; new pending row for Para Tooly should appear.
    await expect(page.getByText('Para Tooly').first()).toBeVisible({ timeout: 10_000 })
  })
})
