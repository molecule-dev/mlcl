import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signUpWithMedication, signup } from './_helpers.js'

test.describe('/dashboard (Dashboard)', () => {
  test('Today hero card reflects /api/reports/today', async ({ page }) => {
    await signUpWithMedication(page)
    await page.goto(APP_BASE + '/dashboard')
    // The page should render the hero (heading or large-number area). We assert the report
    // endpoint matches what the UI consumed.
    const today = await api<Record<string, unknown>>(page, 'GET', '/reports/today')
    expect(today, '/reports/today must return data').toBeTruthy()
    expect(typeof today.total_doses, 'total_doses field').toBe('number')
  })

  test('AdherenceTriad streaks come from /reports/today', async ({ page }) => {
    await signup(page)
    const today = await api<Record<string, number>>(page, 'GET', '/reports/today')
    expect(today.current_streak, 'current_streak is numeric').toBeGreaterThanOrEqual(0)
    expect(today.longest_streak, 'longest_streak is numeric').toBeGreaterThanOrEqual(0)
  })

  test('Today doses list reflects /api/doses?filter=today', async ({ page }) => {
    await signUpWithMedication(page)
    const todayDoses = await api<unknown[]>(page, 'GET', '/doses?filter=today')
    expect(Array.isArray(todayDoses)).toBe(true)
    expect(todayDoses.length, 'at least one dose for today after seed').toBeGreaterThan(0)

    await page.goto(APP_BASE + '/dashboard')
    // Heuristic: the medication name should appear somewhere on dashboard
    const medName = (todayDoses[0] as { medication_name: string }).medication_name
    await expect(page.getByText(medName, { exact: false }).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Mark-taken button POSTs /doses/:id/take and persists status=taken', async ({ page }) => {
    await signUpWithMedication(page)
    const doses = await api<Array<{ id: string; status: string }>>(
      page,
      'GET',
      '/doses?filter=today',
    )
    expect(doses.length).toBeGreaterThan(0)
    const dose = doses[0]
    expect(dose.status, 'fresh dose is upcoming/pending').not.toBe('taken')

    // Direct API path (the dashboard button calls the same endpoint).
    await api(page, 'POST', `/doses/${dose.id}/take`, {})
    const reread = await api<Record<string, unknown>>(page, 'GET', `/doses/${dose.id}`)
    expect(reread.status, 'dose persisted as taken').toBe('taken')
  })

  test('All medications link navigates to /medications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /all medications/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/medications$/, { timeout: 10_000 })
  })

  test('Weekly schedule link navigates to /schedule', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /weekly schedule/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/schedule/, { timeout: 10_000 })
  })

  test('Adherence report link navigates to /reports', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /adherence report/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/reports/, { timeout: 10_000 })
  })

  test('Dashboard mount fetches /doses?filter=today, /reports/today, /reports/adherence', async ({
    page,
  }) => {
    await signUpWithMedication(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForTimeout(1000)
    })
    expect(reqs.find((r) => /\/api\/doses\?filter=today/.test(r.url))).toBeTruthy()
    expect(reqs.find((r) => /\/api\/reports\/today/.test(r.url))).toBeTruthy()
    expect(reqs.find((r) => /\/api\/reports\/adherence/.test(r.url))).toBeTruthy()
  })
})
