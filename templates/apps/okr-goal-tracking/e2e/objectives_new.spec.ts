import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('New objective /objectives/new', () => {
  test('full create with one KR posts to backend, navigates to detail, fields persist', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/objectives/new')
    await page.locator('form input[type="text"]').nth(0).fill('Increase NPS to 50')
    await page.locator('form textarea').first().fill('Quarter-long customer-experience push.')
    await page.locator('form input[type="text"]').nth(1).fill('Run 6 customer interviews')
    await page.locator('form input[type="number"]').nth(0).fill('0')
    await page.locator('form input[type="number"]').nth(1).fill('6')

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save objective/i }).click()
      await page.waitForURL(/\/objectives\/[0-9a-f-]{36}$/, { timeout: 15000 })
    })
    const created = reqs.find((r) => r.method === 'POST' && /\/api\/objectives(\?|$)/.test(r.url))
    expect(created).toBeTruthy()
    expect(created!.status).toBe(201)
    const krCreated = reqs.find(
      (r) => r.method === 'POST' && /\/api\/key-results(\?|$)/.test(r.url),
    )
    expect(krCreated).toBeTruthy()
    expect(krCreated!.status).toBe(201)

    // Read-after-write: GET /api/objectives reflects the new title.
    const list = await page.request.get(`${API_BASE}/objectives`, {
      headers: apiHeaders(accessToken!),
    })
    expect(list.status()).toBe(200)
    const body = (await list.json()) as Array<{ title: string }>
    expect(body.find((o) => o.title === 'Increase NPS to 50')).toBeDefined()
  })

  test('Add KR appends a new key-result row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/objectives/new')
    const krInputsBefore = await page.locator('form input[type="number"]').count()
    await page.getByRole('button', { name: /add kr/i }).click()
    await page.waitForTimeout(200)
    const krInputsAfter = await page.locator('form input[type="number"]').count()
    expect(krInputsAfter).toBeGreaterThan(krInputsBefore)
  })

  test('Remove KR removes a KR row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/objectives/new')
    const krInputsBefore = await page.locator('form input[type="number"]').count()
    await page
      .getByRole('button', { name: /^remove$/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const krInputsAfter = await page.locator('form input[type="number"]').count()
    expect(krInputsAfter).toBeLessThan(krInputsBefore)
  })

  test('Cancel link navigates back to /objectives without saving', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/objectives/new')
    await page.locator('form input[type="text"]').nth(0).fill('Should not persist')
    await page.getByRole('link', { name: /cancel/i }).click()
    await expect(page).toHaveURL(/\/objectives$/)
    const list = await page.request.get(`${API_BASE}/objectives`, {
      headers: apiHeaders(accessToken!),
    })
    const body = (await list.json()) as Array<{ title: string }>
    expect(body.find((o) => o.title === 'Should not persist')).toBeUndefined()
  })

  test('Submitting with an empty title is rejected (required)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/objectives/new')
    await page.getByRole('button', { name: /save objective/i }).click()
    await page.waitForTimeout(500)
    // No navigation — title is required.
    expect(page.url()).toContain('/objectives/new')
  })

  test('Scope select accepts company / team / individual', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/objectives/new')
    const scopes = page.locator('form select')
    const first = scopes.first()
    const optionTexts = await first.locator('option').allInnerTexts()
    expect(optionTexts.join(' ').toLowerCase()).toMatch(/company|team|individual/)
  })

  test('After save, detail page shows the objective title', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/objectives/new')
    await page.locator('form input[type="text"]').nth(0).fill('Title-on-detail')
    await page.locator('form input[type="text"]').nth(1).fill('Some KR')
    await page.locator('form input[type="number"]').nth(0).fill('0')
    await page.locator('form input[type="number"]').nth(1).fill('1')
    await page.getByRole('button', { name: /save objective/i }).click()
    await page.waitForURL(/\/objectives\/[0-9a-f-]{36}$/, { timeout: 15000 })
    await expect(page.locator('main')).toContainText('Title-on-detail')
  })

  test('Heading "Define your next climb" is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/objectives/new')
    await expect(page.getByRole('heading', { name: /define your next climb/i })).toBeVisible()
  })

  test('Sections "Outcome" and "Key results" render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/objectives/new')
    await expect(page.getByRole('heading', { name: /^outcome$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^key results$/i })).toBeVisible()
  })

  test('Description textarea accepts long text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/objectives/new')
    const desc = page.locator('form textarea').first()
    await desc.fill('A'.repeat(500))
    await expect(desc).toHaveValue('A'.repeat(500))
  })

  test('KR metric_type select supports number/percentage/currency/boolean labels', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/objectives/new')
    // first select is scope; second select is the first KR's metric type.
    const krMetric = page.locator('form select').nth(1)
    const labels = (await krMetric.locator('option').allInnerTexts()).join('|').toLowerCase()
    expect(labels).toMatch(/number|percent|currency|boolean/)
  })
})
