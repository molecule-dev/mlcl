import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('/seating page', () => {
  test('renders tables from the API and the unseated pool', async ({ page }) => {
    const email = uniqueEmail('seating-view')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/seating')
    await expect(page.locator('[data-mol-id="page-seating"]')).toBeVisible({
      timeout: 15000,
    })

    const data = (await (
      await page.request.get(`${API_BASE}/seating`, { headers: apiHeaders(accessToken) })
    ).json()) as { tables: Array<{ id: string }>; unassigned: Array<{ id: string }> }
    expect(data.tables.length).toBeGreaterThan(0)

    for (const table of data.tables) {
      await expect(page.locator(`[data-mol-id="seating-table-${table.id}"]`)).toBeVisible()
    }
    await expect(page.locator('[data-mol-id="seating-pool"]')).toBeVisible()
  })

  test('add table POSTs and the chart shows its capacity badge', async ({ page }) => {
    const email = uniqueEmail('seating-add')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/seating')
    await expect(page.locator('[data-mol-id="page-seating"]')).toBeVisible({ timeout: 15000 })

    const name = `E2E Table ${Date.now()}`
    await page.locator('[data-mol-id="seating-form-name"]').fill(name)
    await page.locator('[data-mol-id="seating-form-capacity"]').fill('6')
    // Arm the POST waiter BEFORE clicking submit — the API readback below must
    // not race the form's own request.
    const posted = page.waitForResponse(
      (r) => /\/api\/seating\/tables(\?|$)/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15000 },
    )
    await page.locator('[data-mol-id="seating-form-submit"]').click()
    expect((await posted).status()).toBeLessThan(400)

    const data = (await (
      await page.request.get(`${API_BASE}/seating`, { headers: apiHeaders(accessToken) })
    ).json()) as { tables: Array<{ id: string; name: string; capacity: number }> }
    const created = data.tables.find((t) => t.name === name)
    expect(created?.capacity).toBe(6)
    await expect(page.locator(`[data-mol-id="seating-table-${created?.id}"]`)).toBeVisible({
      timeout: 10000,
    })
  })

  test('seating a guest from the pool assigns them via POST /assign', async ({ page }) => {
    const email = uniqueEmail('seating-assign')
    const { accessToken } = await signup(page, email)

    // A fresh guest is guaranteed to be in the unseated pool. Create it
    // BEFORE the page loads: the pool options render from the page's own
    // initial fetch, so a guest added afterwards never shows up in the seat
    // select. GET /wedding first so the lazily-seeded starter kit exists.
    await page.request.get(`${API_BASE}/wedding`, { headers: apiHeaders(accessToken) })
    const created = await page.request.post(`${API_BASE}/guests`, {
      headers: apiHeaders(accessToken),
      data: { name: `Pool Guest ${Date.now()}` },
    })
    const guest = (await created.json()) as { id: string }

    await page.goto(APP_BASE + '/seating')
    await expect(page.locator('[data-mol-id="page-seating"]')).toBeVisible({ timeout: 15000 })

    const data = (await (
      await page.request.get(`${API_BASE}/seating`, { headers: apiHeaders(accessToken) })
    ).json()) as { tables: Array<{ id: string }> }
    const table = data.tables[0]

    await page.locator(`[data-mol-id="seating-seat-select-${table.id}"]`).selectOption(guest.id)
    await expect(page.locator(`[data-mol-id="seating-seat-${guest.id}"]`)).toBeVisible({
      timeout: 15000,
    })

    const after = (await (
      await page.request.get(`${API_BASE}/seating`, { headers: apiHeaders(accessToken) })
    ).json()) as { tables: Array<{ id: string; guests: Array<{ id: string }> }> }
    expect(after.tables.find((t) => t.id === table.id)?.guests.some((g) => g.id === guest.id)).toBe(
      true,
    )
  })

  test('unseating returns the guest to the pool', async ({ page }) => {
    const email = uniqueEmail('seating-unassign')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/seating')
    await expect(page.locator('[data-mol-id="page-seating"]')).toBeVisible({ timeout: 15000 })

    const created = await page.request.post(`${API_BASE}/guests`, {
      headers: apiHeaders(accessToken),
      data: { name: `Unseat me ${Date.now()}` },
    })
    const guest = (await created.json()) as { id: string }

    const data = (await (
      await page.request.get(`${API_BASE}/seating`, { headers: apiHeaders(accessToken) })
    ).json()) as { tables: Array<{ id: string }> }
    const table = data.tables[0]

    await page.request.post(`${API_BASE}/seating/assign`, {
      headers: apiHeaders(accessToken),
      data: { guest_id: guest.id, table_id: table.id },
    })
    await page.reload()
    await expect(page.locator(`[data-mol-id="seating-seat-${guest.id}"]`)).toBeVisible({
      timeout: 15000,
    })

    await page.locator(`[data-mol-id="seating-unseat-${guest.id}"]`).click()
    await expect(page.locator(`[data-mol-id="seating-pool-${guest.id}"]`)).toBeVisible({
      timeout: 15000,
    })
  })
})
