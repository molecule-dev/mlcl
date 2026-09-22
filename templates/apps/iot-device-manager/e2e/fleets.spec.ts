import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  createDeviceApi,
  listFleets,
  signup,
} from './_helpers.js'

test.describe('Fleets — grouping devices for bulk operations', () => {
  test('empty state, then create-fleet flow PERSISTS via /api/fleets', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/fleets')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await expect(page.getByText(/No fleets yet/i)).toBeVisible()

    await page.getByRole('button', { name: /New fleet/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.locator('input[type="text"]').fill('Berlin Manufacturing')
    await dialog.locator('textarea').fill('Pumps + compressors in DE-01')
    const reqs = await captureNetwork(page, async () => {
      ;(await dialog.getByTestId) ? null : null
      await dialog.locator('[data-mol-id="fleets-create-submit"]').click()
      await expect(dialog).toBeHidden({ timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/fleets(\?|$)/.test(r.url))
    expect(post, 'POST /api/fleets').toBeTruthy()
    expect(post!.status).toBe(201)

    // Read-after-write: fleet appears in UI AND in API list.
    await expect(page.getByText('Berlin Manufacturing')).toBeVisible()
    const list = await listFleets(page, accessToken)
    const created = list.find((f) => f.name === 'Berlin Manufacturing')
    expect(created, 'fleet should round-trip via /api/fleets').toBeTruthy()
    expect(created!.description).toBe('Pumps + compressors in DE-01')
  })

  test('Manage devices: add + remove membership round-trips through /api/fleets/:id/devices', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const d1 = await createDeviceApi(page, accessToken, { name: 'Member-A', device_type: 'sensor' })
    const d2 = await createDeviceApi(page, accessToken, { name: 'Member-B', device_type: 'sensor' })

    // Create a fleet via API to skip past the create-fleet UI we already cover.
    const fleetRes = await page.request.post(`${API_BASE}/fleets`, {
      headers: apiHeaders(accessToken),
      data: { name: 'Membership Test' },
      failOnStatusCode: false,
    })
    expect(fleetRes.status()).toBeLessThan(300)
    const fleet = (await fleetRes.json()) as { id: string }

    await page.goto(APP_BASE + '/fleets')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.locator(`[data-mol-id="fleets-manage-${fleet.id}"]`).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Add d1 — triggers POST /api/fleets/:id/devices
    const addReqs = await captureNetwork(page, async () => {
      await dialog.locator(`[data-mol-id="fleets-toggle-${fleet.id}-${d1.id}"]`).click()
      await page.waitForTimeout(800)
    })
    const addPost = addReqs.find(
      (r) => r.method === 'POST' && new RegExp(`/api/fleets/${fleet.id}/devices`).test(r.url),
    )
    expect(addPost, 'POST membership').toBeTruthy()
    expect(addPost!.status).toBeLessThan(300)

    // Verify via API: GET /fleets/:id/devices includes d1
    const memRes = await page.request.get(`${API_BASE}/fleets/${fleet.id}/devices`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    const members = (await memRes.json()) as Array<{ id: string }>
    expect(members.map((m) => m.id)).toContain(d1.id)
    expect(members.map((m) => m.id)).not.toContain(d2.id)

    // Remove d1 — triggers DELETE
    const removeReqs = await captureNetwork(page, async () => {
      await dialog.locator(`[data-mol-id="fleets-toggle-${fleet.id}-${d1.id}"]`).click()
      await page.waitForTimeout(800)
    })
    const del = removeReqs.find(
      (r) =>
        r.method === 'DELETE' && new RegExp(`/api/fleets/${fleet.id}/devices/${d1.id}`).test(r.url),
    )
    expect(del, 'DELETE membership').toBeTruthy()
    expect(del!.status).toBeLessThan(300)

    const after = await page.request.get(`${API_BASE}/fleets/${fleet.id}/devices`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(((await after.json()) as unknown[]).length).toBe(0)
  })

  test('Delete fleet removes it from /api/fleets', async ({ page }) => {
    const { accessToken } = await signup(page)
    const fleetRes = await page.request.post(`${API_BASE}/fleets`, {
      headers: apiHeaders(accessToken),
      data: { name: 'Doomed Fleet' },
      failOnStatusCode: false,
    })
    const fleet = (await fleetRes.json()) as { id: string }
    expect(fleet.id).toBeTruthy()
    await page.goto(APP_BASE + '/fleets')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.locator(`[data-mol-id="fleets-manage-${fleet.id}"]`).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.locator(`[data-mol-id="fleets-delete-${fleet.id}"]`).click()
    // Two-step inline confirm: the first click only arms "Confirm delete?".
    await expect(dialog.locator(`[data-mol-id="fleets-delete-${fleet.id}"]`)).toContainText(
      /confirm/i,
    )
    await dialog.locator(`[data-mol-id="fleets-delete-${fleet.id}"]`).click()
    await page.waitForTimeout(800)

    const list = await listFleets(page, accessToken)
    expect(list.find((f) => f.id === fleet.id)).toBeUndefined()
  })
})
