import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signUpWithMedication } from './_helpers.js'

test.describe('/schedule (Schedule)', () => {
  test('Schedule page renders Weekly schedule heading', async ({ page }) => {
    await signUpWithMedication(page)
    await page.goto(APP_BASE + '/schedule')
    await expect(page).toHaveURL(/\/schedule/)
    await expect(page.getByRole('heading', { name: /weekly schedule/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Schedule renders day-of-week column headers (Mon–Sun)', async ({ page }) => {
    await signUpWithMedication(page)
    await page.goto(APP_BASE + '/schedule')
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      await expect(page.getByRole('columnheader', { name: day }).first()).toBeVisible({
        timeout: 5_000,
      })
    }
  })

  test('GET /api/doses?filter=week returns at least one dose after seeding a medication', async ({
    page,
  }) => {
    await signUpWithMedication(page)
    const week = await api<unknown[]>(page, 'GET', '/doses?filter=week')
    expect(Array.isArray(week)).toBe(true)
    expect(week.length, 'seeded med produces dose rows for the upcoming week').toBeGreaterThan(0)
  })

  test('Schedule CRUD round-trip: POST /api/schedules + DELETE /api/schedules/:id', async ({
    page,
  }) => {
    const { medication } = await signUpWithMedication(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/schedule')
      await page.waitForTimeout(800)
    })
    expect(reqs.find((r) => /\/api\/doses\?filter=week/.test(r.url))).toBeTruthy()

    // Direct CRUD round-trip on /api/schedules so the handler is exercised end-to-end.
    const list = await api<Array<Record<string, unknown>>>(page, 'GET', '/schedules')
    expect(Array.isArray(list)).toBe(true)
    const created = await api<{ id: string }>(page, 'POST', '/schedules', {
      medication_id: medication.id,
      time_of_day: '21:00',
      times_of_day: ['21:00'],
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
    })
    expect(created.id).toBeTruthy()
    const fetched = await api<Record<string, unknown>>(page, 'GET', `/schedules/${created.id}`)
    expect(fetched.id).toBe(created.id)
    await api(page, 'PATCH', `/schedules/${created.id}`, { time_of_day: '22:00' })
    await api(page, 'PUT', `/schedules/${created.id}`, { time_of_day: '23:00' })
    await api(page, 'DELETE', `/schedules/${created.id}`)
    const list2 = await api<Array<{ id: string }>>(page, 'GET', '/schedules')
    expect(
      list2.find((s) => s.id === created.id),
      'schedule deleted',
    ).toBeFalsy()
  })
})
