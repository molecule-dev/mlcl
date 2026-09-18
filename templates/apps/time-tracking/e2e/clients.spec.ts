import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, seedClient, signup } from './_helpers.js'

test.describe('/clients page', () => {
  test('clients page root + h1 visible after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/clients')
    await expect(page.locator('[data-test="clients-page"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /^clients$/i })).toBeVisible()
  })

  test('empty-state visible for a fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/clients')
    await expect(page.locator('[data-test="clients-empty"]')).toBeVisible()
  })

  test('toggle reveals the create-client form with all fields', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/clients')
    await page.locator('[data-test="new-client-toggle"]').click()
    await expect(page.locator('[data-test="new-client-form"]')).toBeVisible()
    await expect(page.locator('[data-test="client-name"]')).toBeVisible()
    await expect(page.locator('[data-test="client-email"]')).toBeVisible()
    await expect(page.locator('[data-test="client-currency"]')).toBeVisible()
    await expect(page.locator('[data-test="client-rate"]')).toBeVisible()
    await expect(page.locator('[data-test="client-submit"]')).toBeVisible()
  })

  test('create client → row visible, GET /api/clients returns it, persists across reload', async ({
    page,
  }) => {
    const auth = await signup(page)
    await page.goto(APP_BASE + '/clients')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-test="new-client-toggle"]').click()
      await page.locator('[data-test="client-name"]').fill('Northbridge Co')
      await page.locator('[data-test="client-email"]').fill('billing@acme.test')
      await page.locator('[data-test="client-rate"]').fill('120')
      await page.locator('[data-test="client-submit"]').click()
      await page.waitForTimeout(1500)
    })
    const created = reqs.find((r) => r.method === 'POST' && /\/api\/clients\/?$/.test(r.url))
    expect(created?.status, 'POST /api/clients').toBe(201)

    await expect(page.locator('text=Northbridge Co')).toBeVisible()

    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=Northbridge Co')).toBeVisible()

    const list = await page.request.get(`${API_BASE}/clients`, {
      headers: apiHeaders(auth.accessToken),
    })
    expect(list.ok()).toBe(true)
    const body = (await list.json()) as Array<{ name: string; hourly_rate_cents: number }>
    const arr = Array.isArray(body) ? body : ((body as { data?: typeof body }).data ?? [])
    const found = arr.find((c) => c.name === 'Northbridge Co')
    expect(found, 'client persisted in DB').toBeTruthy()
    expect(found!.hourly_rate_cents).toBe(12000)
  })

  test('seeded client row links to /clients/:id', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'Stark Industries' })
    await page.goto(APP_BASE + '/clients')
    await page.waitForLoadState('domcontentloaded')
    await page.locator(`[data-test="client-row-${client.id}"]`).click()
    await page.waitForURL(`**/clients/${client.id}`, { timeout: 10000 })
    await expect(page.locator('[data-test="client-detail"]')).toBeVisible()
  })

  test('clients h1 heading explicitly renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/clients')
    await expect(page.getByRole('heading', { name: /^clients$/i })).toBeVisible()
  })

  test('client-name field accepts typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/clients')
    await page.locator('[data-test="new-client-toggle"]').click()
    await page.locator('[data-test="client-name"]').fill('Wayne Enterprises')
    await expect(page.locator('[data-test="client-name"]')).toHaveValue('Wayne Enterprises')
  })

  test('client-email field accepts typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/clients')
    await page.locator('[data-test="new-client-toggle"]').click()
    await page.locator('[data-test="client-email"]').fill('billing@wayne.test')
    await expect(page.locator('[data-test="client-email"]')).toHaveValue('billing@wayne.test')
  })

  test('client-currency field renders with default USD', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/clients')
    await page.locator('[data-test="new-client-toggle"]').click()
    await expect(page.locator('[data-test="client-currency"]')).toBeVisible()
  })

  test('client-rate field accepts numeric input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/clients')
    await page.locator('[data-test="new-client-toggle"]').click()
    await page.locator('[data-test="client-rate"]').fill('150')
    await expect(page.locator('[data-test="client-rate"]')).toHaveValue('150')
  })

  test('clients load fires GET /api/clients', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/clients')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.find((r) => r.method === 'GET' && /\/api\/clients/.test(r.url))).toBeTruthy()
  })
})
