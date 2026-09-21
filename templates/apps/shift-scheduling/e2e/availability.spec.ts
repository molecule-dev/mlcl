/**
 * /availability — weekly windows + black-out dates: render, add, remove.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, pickStaff, signup } from './_helpers.js'

test.describe('availability page', () => {
  test('renders the seeded windows and blackouts', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/availability')
    await expect(page.getByRole('heading', { name: /availability/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /weekly windows/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /black-out dates/i })).toBeVisible()
    void accessToken
  })

  test('add window → list reflects it → remove → gone', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await pickStaff(page, accessToken)
    await page.goto(APP_BASE + '/availability')
    const select = page.locator('[data-mol-id="availability-staff-select"]')
    await select.selectOption({ label: person.name })
    // Add a Wednesday 08:00–16:00 window.
    await page.locator('select').nth(1).selectOption({ label: 'Wednesday' })
    await page.locator('input[type="time"]').nth(0).fill('08:00')
    await page.locator('input[type="time"]').nth(1).fill('16:00')
    await page.getByRole('button', { name: /^add window$/i }).click()
    const listRes = await page.request.get(`${API_BASE}/availabilities?staff_id=${person.id}`, {
      headers: apiHeaders(accessToken),
    })
    const windows = (await listRes.json()) as Array<{
      id: string
      weekday: number
      start_time: string
    }>
    const added = windows.find((w) => w.weekday === 3 && w.start_time === '08:00')
    expect(added, 'the posted window must be readable back').toBeDefined()
    await page.reload()
    await select.selectOption({ label: person.name })
    await expect(page.locator(`[data-mol-id="availability-window-${added!.id}"]`)).toBeVisible()
    await page
      .locator(`[data-mol-id="availability-window-${added!.id}"]`)
      .getByRole('button', { name: /remove/i })
      .click()
    await expect(page.locator(`[data-mol-id="availability-window-${added!.id}"]`)).toHaveCount(0, {
      timeout: 10_000,
    })
  })

  test('add black-out date → appears → remove → gone', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await pickStaff(page, accessToken)
    await page.goto(APP_BASE + '/availability')
    const select = page.locator('[data-mol-id="availability-staff-select"]')
    await select.selectOption({ label: person.name })
    await page
      .locator('[data-mol-id="availability-add-blackout"]')
      .locator('..')
      .locator('input[type="date"]')
      .fill('2026-12-24')
    await page.getByRole('button', { name: /^add black-out$/i }).click()
    const listRes = await page.request.get(`${API_BASE}/availabilities/blackouts`, {
      headers: apiHeaders(accessToken),
    })
    const blackouts = (await listRes.json()) as Array<{
      id: string
      date: string
      staff_id: string
    }>
    const added = blackouts.find((b) => b.staff_id === person.id && b.date === '2026-12-24')
    expect(added, 'the posted black-out must be readable back').toBeDefined()
    await page.reload()
    await select.selectOption({ label: person.name })
    await expect(page.locator(`[data-mol-id="availability-blackout-${added!.id}"]`)).toBeVisible()
    await page
      .locator(`[data-mol-id="availability-blackout-${added!.id}"]`)
      .getByRole('button', { name: /remove/i })
      .click()
    await expect(page.locator(`[data-mol-id="availability-blackout-${added!.id}"]`)).toHaveCount(
      0,
      { timeout: 10_000 },
    )
  })
})
