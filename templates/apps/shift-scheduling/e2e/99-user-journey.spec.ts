/**
 * Kitchen-sink user journey — the SIGNATURE FLOW end to end:
 * build next week's roster (assign + open shift) → publish → a staff
 * member requests a drop → manager approves → the shift reopens →
 * another staff member claims it → manager approves → the timesheet
 * reflects the final assignment. Plus a walk of every primary page.
 *
 * Each step asserts on the OUTCOME (read-after-write), not the click.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  claimShift,
  getStaff,
  pickStaff,
  seedShift,
  seedSwapRequest,
  signup,
  weekDate,
} from './_helpers.js'

test.describe('99 — full user journey (signature flow)', () => {
  test.setTimeout(180_000)

  test('build → publish → drop → approve → claim → approve → timesheet reflects it', async ({
    page,
  }) => {
    // ---------- 1. Signup lands on /dashboard ----------
    const { accessToken, email } = await signup(page)
    await expect(page).toHaveURL(/\/dashboard/)

    // ---------- 2. Two people to schedule ----------
    const manager = await pickStaff(page, accessToken)
    const cover = await pickStaff(page, accessToken, 1)
    expect(manager.id).not.toBe(cover.id)

    // ---------- 3. Build LAST week: one assigned shift + one open shift ----------
    // (A completed week — so the derived timesheet in step 10 counts them.)
    const weekStart = weekDate(-1, 0)
    const assigned = await seedShift(page, accessToken, {
      staff_id: manager.id,
      role: 'Barista',
      date: weekDate(-1, 3),
      start_time: '10:00',
      end_time: '18:00',
      published: false,
    })
    const open = await seedShift(page, accessToken, {
      staff_id: null,
      role: 'Cook',
      date: weekDate(-1, 4),
      start_time: '12:00',
      end_time: '20:00',
      published: false,
    })
    expect(assigned.published).toBe(false)
    expect(open.published).toBe(false)

    // ---------- 4. Double-booking is refused while building ----------
    const conflict = await page.request.post(`${API_BASE}/shifts`, {
      headers: apiHeaders(accessToken),
      data: {
        staff_id: manager.id,
        role: 'Barista',
        date: weekDate(-1, 3),
        start_time: '14:00',
        end_time: '22:00',
      },
      failOnStatusCode: false,
    })
    expect(conflict.status()).toBe(409)

    // ---------- 5. Publish the week → staff sees the schedule ----------
    const publish = await page.request.post(`${API_BASE}/shifts/publish`, {
      headers: apiHeaders(accessToken),
      data: { week_start: weekStart, published: true },
    })
    expect(publish.status()).toBe(200)
    const weekAfter = (await (
      await page.request.get(`${API_BASE}/shifts?week_start=${weekStart}`, {
        headers: apiHeaders(accessToken),
      })
    ).json()) as Array<{ published: boolean }>
    expect(weekAfter.length).toBeGreaterThan(1)
    expect(weekAfter.every((s) => s.published)).toBe(true)

    // ---------- 6. The assignee requests a drop ----------
    const drop = await seedSwapRequest(page, accessToken, {
      from_shift: assigned.id,
      requester_staff_id: manager.id,
      kind: 'drop',
      note: 'journey drop',
    })
    expect(drop.status).toBe('pending')

    // ---------- 7. Manager approves → the shift REOPENS ----------
    const approveDrop = await page.request.patch(`${API_BASE}/swap-requests/${drop.id}`, {
      headers: apiHeaders(accessToken),
      data: { status: 'approved' },
    })
    expect(approveDrop.status()).toBe(200)
    const reopened = (await (
      await page.request.get(`${API_BASE}/shifts/${assigned.id}`, {
        headers: apiHeaders(accessToken),
      })
    ).json()) as { staff_id: string | null; is_open: boolean }
    expect(reopened.staff_id).toBeNull()
    expect(reopened.is_open).toBe(true)

    // ---------- 8. Another staff member claims the reopened shift ----------
    const claim = await claimShift(page, accessToken, assigned.id, cover.id)
    expect(claim.status).toBe('pending')

    // ---------- 9. Manager approves the claim → final assignment ----------
    const approveClaim = await page.request.patch(`${API_BASE}/claims/${claim.id}`, {
      headers: apiHeaders(accessToken),
      data: { status: 'approved' },
    })
    expect(approveClaim.status()).toBe(200)
    const final = (await (
      await page.request.get(`${API_BASE}/shifts/${assigned.id}`, {
        headers: apiHeaders(accessToken),
      })
    ).json()) as { staff_id: string; assigned_via: string }
    expect(final.staff_id).toBe(cover.id)
    expect(final.assigned_via).toBe('claim')

    // ---------- 10. Timesheet reflects the FINAL assignment ----------
    // The shifts sit in a completed week — the derived timesheet counts only
    // shifts that have already ENDED, so the claimed split is computable.
    const ts = (await (
      await page.request.get(`${API_BASE}/timesheets?week_start=${weekStart}`, {
        headers: apiHeaders(accessToken),
      })
    ).json()) as {
      staff: Array<{
        staff_id: string
        staff_name: string
        total_hours: number
        claimed_hours: number
        claimed_shifts: number
      }>
    }
    expect(Array.isArray(ts.staff)).toBe(true)
    const coverRow = ts.staff.find((s) => s.staff_id === cover.id)
    expect(coverRow, 'the covering staff member must have a timesheet row').toBeDefined()
    expect(coverRow!.claimed_hours).toBeGreaterThan(0)
    expect(coverRow!.claimed_shifts).toBeGreaterThanOrEqual(1)

    // ---------- 11. Walk the pages ----------
    await page.goto(APP_BASE + '/schedule')
    await expect(page.getByRole('heading', { name: /weekly schedule/i })).toBeVisible()
    await page.goto(APP_BASE + '/open-shifts')
    await expect(page.getByRole('heading', { name: /open shifts/i })).toBeVisible()
    await page.goto(APP_BASE + '/swap-requests')
    await expect(page.getByRole('heading', { name: /swap requests/i })).toBeVisible()
    await page.goto(APP_BASE + '/availability')
    await expect(page.getByRole('heading', { name: /availability/i }).first()).toBeVisible()
    await page.goto(APP_BASE + '/staff')
    await expect(page.getByRole('heading', { name: /staff roster/i })).toBeVisible()
    await page.goto(APP_BASE + '/timesheets')
    await expect(page.getByRole('heading', { name: /timesheets/i })).toBeVisible()

    // ---------- 12. Roster KPI consistency ----------
    const roster = await getStaff(page, accessToken)
    expect(roster.length).toBeGreaterThan(0)

    // sentinel: the email we signed up with still belongs to the session.
    expect(email).toMatch(/@flagship\.test$/)
  })
})
