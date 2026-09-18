import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('02: clients — CRUD, persistence across reload', () => {
  test('create a client via UI → row visible, GET /api/clients returns it, persists across reload', async ({
    page,
  }) => {
    const auth = await signup(page)
    await page.goto(APP_BASE + '/clients')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-test=new-client-toggle]').click()
      await page.locator('[data-test=client-name]').fill('Northbridge Co')
      await page.locator('[data-test=client-email]').fill('billing@acme.test')
      await page.locator('[data-test=client-rate]').fill('120')
      await page.locator('[data-test=client-submit]').click()
      await page.waitForTimeout(1500)
    })
    const created = reqs.find((r) => r.method === 'POST' && /\/api\/clients\/?$/.test(r.url))
    expect(created, 'POST /api/clients').toBeTruthy()
    expect(created!.status).toBe(201)

    // UI shows it
    await expect(page.locator('text=Northbridge Co')).toBeVisible()

    // Reload — still there
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=Northbridge Co')).toBeVisible()

    // GET reflects the write
    const list = await page.request.get(`${API_BASE}/clients`, {
      headers: apiHeaders(auth.accessToken),
    })
    expect(list.ok()).toBe(true)
    const body = (await list.json()) as Array<{ name: string; hourly_rate_cents: number }>
    const arr = Array.isArray(body) ? body : ((body as { data?: typeof body }).data ?? [])
    const found = arr.find((c) => c.name === 'Northbridge Co')
    expect(found, 'client in list').toBeTruthy()
    expect(found!.hourly_rate_cents).toBe(12000)
  })

  test('client detail page shows totals and projects after seeding', async ({ page }) => {
    const auth = await signup(page)
    // Use API to seed a client → project → entry → invoice
    const c = await page.request
      .post(`${API_BASE}/clients`, {
        headers: apiHeaders(auth.accessToken),
        data: {
          name: 'Globex',
          email: 'pay@globex.test',
          hourly_rate_cents: 10000,
          billing_currency: 'USD',
        },
      })
      .then((r) => r.json())
      .then((b: unknown) => ((b as { data?: { id: string } }).data ?? (b as { id: string })).id)
    const p = await page.request
      .post(`${API_BASE}/projects`, {
        headers: apiHeaders(auth.accessToken),
        data: {
          name: 'Site Refresh',
          client_id: c,
          hourly_rate_cents: 12000,
          budget_cents: 200000,
          color: '#10b981',
          billable: true,
        },
      })
      .then((r) => r.json())
      .then((b: unknown) => ((b as { data?: { id: string } }).data ?? (b as { id: string })).id)
    await page.request.post(`${API_BASE}/entries`, {
      headers: apiHeaders(auth.accessToken),
      data: {
        description: 'Logo concepting',
        project_id: p,
        started_at: new Date(Date.now() - 60 * 60_000).toISOString(),
        ended_at: new Date().toISOString(),
        is_billable: true,
      },
    })

    await page.goto(APP_BASE + '/clients/' + c)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-test=client-detail]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Globex' })).toBeVisible()
    await expect(page.locator('text=Site Refresh').first()).toBeVisible()
    // 1h tracked
    await expect(page.locator('text=/1h 00m/').first()).toBeVisible()
  })
})
