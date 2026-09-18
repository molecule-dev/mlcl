import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signUpWithMedication } from './_helpers.js'

test.describe('/refills (Refills)', () => {
  test('Refills page renders heading', async ({ page }) => {
    await signUpWithMedication(page)
    await page.goto(APP_BASE + '/refills')
    await expect(page).toHaveURL(/\/refills/)
    await expect(page.getByRole('heading', { name: /^refills$/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Summary tiles count categories from /refills/alerts', async ({ page }) => {
    await signUpWithMedication(page)
    await page.goto(APP_BASE + '/refills')
    // Tiles render Urgent / Due soon / Healthy supply numbers from server data.
    await expect(page.getByText(/urgent/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/due soon/i).first()).toBeVisible()
    await expect(page.getByText(/healthy supply/i).first()).toBeVisible()
  })

  test('Alert row renders one card per active medication from /refills/alerts', async ({
    page,
  }) => {
    const { medication } = await signUpWithMedication(page)
    const alerts = await api<unknown[]>(page, 'GET', '/refills/alerts')
    expect(alerts.length, 'one alert per active medication').toBeGreaterThan(0)

    await page.goto(APP_BASE + '/refills')
    await expect(
      page.getByText(new RegExp(String(medication.name).split(' ')[0]!, 'i')).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('Request refill POSTs /api/refills/:id/request and persists a refill_request row', async ({
    page,
  }) => {
    const { medication } = await signUpWithMedication(page)
    const before = await api<unknown[]>(page, 'GET', '/refills?status=requested')
    expect(before.length).toBe(0)

    // The button issues POST /api/refills/:medication_id/request — we drive the API directly to
    // assert persistence (UI also exposes the same flow).
    await api(page, 'POST', `/refills/${medication.id}/request`, {})
    const after = await api<unknown[]>(page, 'GET', '/refills?status=requested')
    expect(after.length, 'refill_request row persisted').toBeGreaterThan(0)

    // And the alerts feed flips to status=requested for that medication.
    const alerts2 = await api<Array<{ id: string; status: string }>>(page, 'GET', '/refills/alerts')
    const row = alerts2.find((a) => a.id === medication.id)
    expect(row?.status, 'alert flips to requested').toBe('requested')
  })

  test('Refills CRUD round-trip exercises POST/PUT/PATCH/DELETE /api/refills', async ({ page }) => {
    const { medication } = await signUpWithMedication(page)
    const created = await api<{ id: string }>(page, 'POST', '/refills', {
      medication_id: medication.id,
      pharmacy: 'Pharmacy A',
    })
    expect(created.id).toBeTruthy()
    const fetched = await api<Record<string, unknown>>(page, 'GET', `/refills/${created.id}`)
    expect(fetched.id).toBe(created.id)
    await api(page, 'PATCH', `/refills/${created.id}`, { status: 'in_transit' })
    await api(page, 'PUT', `/refills/${created.id}`, { status: 'filled' })
    await api(page, 'DELETE', `/refills/${created.id}`)
    const after = await api<Array<{ id: string }>>(page, 'GET', '/refills')
    expect(
      after.find((r) => r.id === created.id),
      'refill deleted',
    ).toBeFalsy()
  })

  test('GET /api/refills/due returns low-supply medications (≤7 days)', async ({ page }) => {
    const { medication } = await signUpWithMedication(page)
    // Update supply to 3 → should appear in due
    await api(page, 'PATCH', `/medications/${medication.id}`, { supply_remaining: 3 })
    const due = await api<Array<{ id: string }>>(page, 'GET', '/refills/due')
    expect(due.find((m) => m.id === medication.id)).toBeTruthy()
  })

  test('Refills page mount captures /api/refills/alerts', async ({ page }) => {
    await signUpWithMedication(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/refills')
      await page.waitForTimeout(800)
    })
    expect(
      reqs.find((r) => /\/api\/refills\/alerts/.test(r.url) && r.method === 'GET'),
    ).toBeTruthy()
  })
})
