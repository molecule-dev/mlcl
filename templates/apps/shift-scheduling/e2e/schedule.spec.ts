/**
 * /schedule — the signature screen: weekly grid renders staff rows and
 * day columns, week navigation works, the add-shift composer posts to
 * /api/shifts, and the double-booking rule is enforced server-side.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  pickStaff,
  seedShift,
  seedStaff,
  signup,
  weekDate,
} from './_helpers.js'

test.describe('schedule page', () => {
  test('weekly grid renders and initial mount fetches /api/shifts', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedShift(page, accessToken, { staff_id: (await pickStaff(page, accessToken)).id })
    const reqs = await captureNetwork(page, async () => {
      // Arm BEFORE goto (playbook hygiene): the page header renders in the
      // loading state, so the heading alone can become visible before the
      // mount fetch's /api/shifts RESPONSE arrives — under parallel-suite
      // API contention that closed the capture window early and flaked the
      // request assertion. Waiting for the response keeps the window honest.
      const shiftsLoaded = page.waitForResponse(
        (r) => /\/api\/shifts(?:\?|$)/.test(r.url()) && r.request().method() === 'GET',
      )
      await page.goto(APP_BASE + '/schedule')
      await shiftsLoaded
      await expect(page.getByRole('heading', { name: /weekly schedule/i })).toBeVisible()
    })
    expect(reqs.find((r) => /\/api\/shifts(?:\?|$)/.test(r.url) && r.method === 'GET')).toBeTruthy()
    // The grid header exposes the seven day columns.
    await expect(page.getByRole('columnheader', { name: /^mon/i }).first()).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /^sun/i }).first()).toBeVisible()
  })

  test('next week navigation shifts the grid to the following week', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedShift(page, accessToken, { date: weekDate(1, 2) })
    await page.goto(APP_BASE + '/schedule')
    const label = page.locator('[data-mol-id="schedule-week-label"]')
    await expect(label).toBeVisible()
    const thisWeekText = await label.textContent()
    await page.getByRole('button', { name: /next week/i }).click()
    await expect(label).not.toHaveText(thisWeekText ?? '', { timeout: 10_000 })
  })

  test('Add shift composer posts to /api/shifts and the block appears', async ({ page }) => {
    const { accessToken } = await signup(page)
    // A freshly created staff member has no seeded shifts, so the composed
    // shift can never collide with the demo roster (the API 409s overlaps).
    const person = await seedStaff(page, accessToken)
    await page.goto(APP_BASE + '/schedule')
    await page.getByRole('button', { name: /^add shift$/i }).click()
    const employeeSelect = page.locator('select').first()
    await employeeSelect.selectOption({ label: `${person.name} · ${person.role}` })
    await page.locator('input[type="date"]').fill(weekDate(0, 3))
    await page
      .getByRole('button', { name: /^add shift$/i })
      .last()
      .click()
    await expect(page.locator('a[data-mol-id^="schedule-shift-"]').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('server refuses double-booking a staff member (409, no write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await pickStaff(page, accessToken)
    const first = await seedShift(page, accessToken, {
      staff_id: person.id,
      date: weekDate(1, 1),
      start_time: '10:00',
      end_time: '18:00',
    })
    expect(first.id).toBeTruthy()
    const conflict = await page.request.post(`${API_BASE}/shifts`, {
      headers: apiHeaders(accessToken),
      data: {
        staff_id: person.id,
        role: 'Barista',
        date: weekDate(1, 1),
        start_time: '12:00',
        end_time: '16:00',
      },
      failOnStatusCode: false,
    })
    expect(conflict.status()).toBe(409)
    const body = (await conflict.json()) as { code?: string; conflict_with?: string }
    expect(body.code).toBe('shift_conflict')
    expect(body.conflict_with).toBe(first.id)
  })

  test('Publish week flips every shift in the week to published', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await pickStaff(page, accessToken)
    await seedShift(page, accessToken, {
      staff_id: person.id,
      date: weekDate(1, 4),
      published: false,
    })
    const res = await page.request.post(`${API_BASE}/shifts/publish`, {
      headers: apiHeaders(accessToken),
      data: { week_start: weekDate(1, 0), published: true },
    })
    expect(res.status()).toBe(200)
    const after = await page.request.get(`${API_BASE}/shifts?week_start=${weekDate(1, 0)}`, {
      headers: apiHeaders(accessToken),
    })
    const shifts = (await after.json()) as Array<{ published: boolean }>
    expect(shifts.length).toBeGreaterThan(0)
    expect(shifts.every((s) => s.published)).toBe(true)
  })
})
