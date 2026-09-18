/**
 * /clients — list, create, search.
 *
 * Asserts on real outcomes:
 *  - new user lands on /clients with the clients their account was
 *    provisioned with (read from GET /api/clients, never named here).
 *  - "Add client" modal create flow persists a real DB row (read-after-write
 *    via GET /api/clients).
 *  - search box filters the rendered list to the matching name.
 *  - delete via API removes the row (GET no longer returns it).
 *  - PUT updates persist (read-after-write).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  getClients,
  seedClient,
  signup,
} from './_helpers.js'

test.describe('clients page', () => {
  test('renders heading and the clients the account holds', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Wait for the GET /api/clients fired on mount to complete before
    // asserting on the rendered seed clients. waitForTimeout(1500) was
    // racing slow first-render + DB cold-start; the auto-retrying
    // toBeVisible() with a generous timeout also covers post-fetch
    // hydration without flake.
    const clientsResponse = page.waitForResponse(
      (r) =>
        /\/api\/clients(\?|$)/.test(r.url()) &&
        r.request().method() === 'GET' &&
        r.status() === 200,
      { timeout: 15000 },
    )
    await page.goto(APP_BASE + '/clients')
    await expect(page.getByRole('heading', { name: /^Clients$/ })).toBeVisible()
    await clientsResponse
    // The client to look for comes from the API, so this still holds once
    // the demo book is replaced (auto-retried).
    const clients = await getClients(page, accessToken)
    expect(clients.length, 'a fresh account is provisioned with clients').toBeGreaterThan(0)
    const first = clients[0]
    if (!first) throw new Error('no clients returned')
    await expect(page.getByText(first.name).first()).toBeVisible({ timeout: 10000 })
  })

  test('"Add client" modal creates a persisted DB row', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/clients')
    await page.waitForTimeout(1000)

    const newName = `Probe Client ${Date.now()}`
    await page.locator('[data-action="add-client"]').click()
    await expect(page.locator('[data-testid="new-client-modal"]')).toBeVisible()
    await page.locator('[data-field="clientName"]').fill(newName)
    await page.locator('[data-field="clientEmail"]').fill('probe@flagship.test')
    await page.locator('[data-field="clientCompany"]').fill('Probe Co')
    await page.locator('[data-action="create-client"]').click()

    // Modal closes, feedback appears, row is in the DOM.
    await page.waitForSelector('[data-testid="new-client-modal"]', {
      state: 'detached',
      timeout: 10000,
    })
    await expect(page.getByTestId('clients-feedback')).toBeVisible()
    await expect(page.getByText(newName).first()).toBeVisible()

    // Read-after-write via API.
    const res = await page.request.get(`${API_BASE}/clients`, { headers: apiHeaders(accessToken) })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{ name: string; email?: string }>
    const found = body.find((c) => c.name === newName)
    expect(found, 'persisted client').toBeTruthy()
    expect(found?.email).toBe('probe@flagship.test')
  })

  test('search input filters rendered cards', async ({ page }) => {
    const { accessToken } = await signup(page)
    const sentinel = 'ZZ Search Sentinel'
    await seedClient(page, accessToken, { name: sentinel, email: 'sent@flagship.test' })
    // The client that must DISAPPEAR is read from the book, so the negative
    // half of this check survives the demo clients being replaced.
    const other = (await getClients(page, accessToken)).find((c) => c.name !== sentinel)
    if (!other) throw new Error('need a second client to prove the filter excludes it')
    await page.goto(APP_BASE + '/clients')
    await page.waitForTimeout(1500)
    await expect(page.getByText(other.name).first()).toBeVisible()
    await page.getByLabel(/Search by name/i).fill(sentinel)
    await expect(page.getByText(sentinel).first()).toBeVisible()
    // The non-matching client is filtered out.
    await expect(page.getByText(other.name)).toHaveCount(0)
  })

  test('PUT /api/clients/:id persists changes (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const c = await seedClient(page, accessToken, { name: 'Original Name' })
    const updated = await page.request.put(`${API_BASE}/clients/${c.id}`, {
      headers: apiHeaders(accessToken),
      data: { name: 'Updated Name', notes: 'now with notes' },
    })
    expect(updated.status(), await updated.text()).toBe(200)
    const get = await page.request.get(`${API_BASE}/clients/${c.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await get.json()) as { name: string; notes?: string }
    expect(body.name).toBe('Updated Name')
    expect(body.notes).toBe('now with notes')
  })

  test('DELETE /api/clients/:id removes the client (404 on subsequent GET)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const c = await seedClient(page, accessToken, { name: 'Soon Deleted' })
    const del = await page.request.delete(`${API_BASE}/clients/${c.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(del.status()).toBe(204)
    const get = await page.request.get(`${API_BASE}/clients/${c.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(get.status(), 'deleted client should 404').toBe(404)
  })

  test('initial mount fires GET /api/clients and Add modal submit fires POST /api/clients (captureNetwork)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/clients')
      await expect(page.getByRole('heading', { name: /^Clients$/ })).toBeVisible()
      await page.waitForTimeout(1500)

      await page.locator('[data-action="add-client"]').click()
      await expect(page.locator('[data-testid="new-client-modal"]')).toBeVisible()
      await page.locator('[data-field="clientName"]').fill(`NetCheck ${Date.now()}`)
      await page.locator('[data-field="clientEmail"]').fill('netcheck@flagship.test')
      await page.locator('[data-action="create-client"]').click()
      await page.waitForSelector('[data-testid="new-client-modal"]', {
        state: 'detached',
        timeout: 10000,
      })
    })
    expect(
      reqs.some((r) => r.method === 'GET' && r.url.includes('/api/clients') && r.status === 200),
      'expected GET /api/clients on mount',
    ).toBe(true)
    expect(
      reqs.some((r) => r.method === 'POST' && r.url.includes('/api/clients') && r.status === 201),
      'expected POST /api/clients on submit',
    ).toBe(true)
  })

  test('client card click navigates to /clients/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const c = await seedClient(page, accessToken, { name: `ClickThru ${Date.now()}` })
    await page.goto(APP_BASE + '/clients')
    await page.waitForTimeout(1500)
    await page.getByText(c.name).first().click()
    await page.waitForURL(new RegExp(`/clients/${c.id}`), { timeout: 10000 })
    await expect(page).toHaveURL(new RegExp(`/clients/${c.id}`))
  })
})
