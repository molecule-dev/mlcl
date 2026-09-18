import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signUpWithMedication } from './_helpers.js'

test.describe('/reports (AdherenceReport)', () => {
  test('Adherence page renders heading', async ({ page }) => {
    await signUpWithMedication(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page).toHaveURL(/\/reports/)
    await expect(page.getByRole('heading', { name: /adherence report/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('KPI tiles reflect /api/reports/adherence (current_adherence + streaks)', async ({
    page,
  }) => {
    await signUpWithMedication(page)
    const data = await api<Record<string, unknown>>(page, 'GET', '/reports/adherence')
    expect(typeof data.current_adherence).toBe('number')
    expect(typeof data.current_streak).toBe('number')
    expect(typeof data.longest_streak).toBe('number')
    expect(typeof data.doses_taken_30d).toBe('number')
    expect(typeof data.doses_missed_30d).toBe('number')
  })

  test('daily_30d returns 30 entries', async ({ page }) => {
    await signUpWithMedication(page)
    const data = await api<{ daily_30d: unknown[] }>(page, 'GET', '/reports/adherence')
    expect(Array.isArray(data.daily_30d)).toBe(true)
    expect(data.daily_30d.length).toBeGreaterThanOrEqual(30)
  })

  test('by_medication includes the seeded medication after a dose is taken', async ({ page }) => {
    const { medication } = await signUpWithMedication(page)
    const todays = await api<Array<{ id: string }>>(page, 'GET', '/doses?filter=today')
    if (todays[0]) await api(page, 'POST', `/doses/${todays[0].id}/take`, {})
    const data = await api<{ by_medication: Array<{ medication_id: string }> }>(
      page,
      'GET',
      '/reports/adherence',
    )
    expect(
      data.by_medication.find((b) => b.medication_id === medication.id),
      'seeded med appears in by_medication breakdown',
    ).toBeTruthy()
  })

  test('Reports page mount captures /api/reports/adherence', async ({ page }) => {
    await signUpWithMedication(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports')
      await page.waitForTimeout(800)
    })
    expect(reqs.find((r) => /\/api\/reports\/adherence/.test(r.url))).toBeTruthy()
  })
})
