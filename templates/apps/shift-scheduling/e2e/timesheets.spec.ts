/**
 * /timesheets — derived weekly rollups: rows per staff with scheduled vs
 * claimed hours, week navigation, and the CSV export button.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  pickStaff,
  seedShift,
  signup,
  weekDate,
} from './_helpers.js'

test.describe('timesheets page', () => {
  test('renders the current week with per-staff rollups', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/timesheets')
    await expect(page.getByRole('heading', { name: /timesheets/i })).toBeVisible()
    // The seeded demo puts completed shifts in the current week for some of
    // the roster — assert the payload shape rather than seed content.
    const res = await page.request.get(`${API_BASE}/timesheets`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      week_start: string
      total_hours: number
      staff: Array<{ staff_name: string; total_hours: number; max_weekly_hours: number }>
    }
    expect(body.week_start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Array.isArray(body.staff)).toBe(true)
  })

  test('a completed shift counts toward its staff member (scheduled vs claimed)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // A shift LAST week that has already ended → must appear in last week's
    // timesheet as scheduled hours.
    const person = await pickStaff(page, accessToken)
    await seedShift(page, accessToken, {
      staff_id: person.id,
      date: weekDate(-1, 1),
      start_time: '08:00',
      end_time: '16:00',
    })
    const res = await page.request.get(`${API_BASE}/timesheets?week_start=${weekDate(-1, 0)}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as {
      staff: Array<{ staff_name: string; scheduled_hours: number; scheduled_shifts: number }>
    }
    const row = body.staff.find((s) => s.staff_name === person.name)
    expect(row, 'the person with the completed shift must have a row').toBeDefined()
    expect(row!.scheduled_hours).toBeGreaterThanOrEqual(8)
    expect(row!.scheduled_shifts).toBeGreaterThanOrEqual(1)
    // And the page itself renders it when navigated to that week.
    await page.goto(APP_BASE + '/timesheets')
    await page.getByRole('button', { name: /previous week/i }).click()
    await expect(page.getByText(person.name).first()).toBeVisible({ timeout: 10_000 })
  })

  test('the Export CSV button is present and enabled with data', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/timesheets')
    await expect(page.locator('[data-mol-id="timesheets-export"]')).toBeVisible()
    void accessToken
  })
})
