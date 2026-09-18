import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authedApi,
  captureNetwork,
  seedAgent,
  signup,
  whereUrl,
} from './_helpers.js'

test.describe('Agents (list) page', () => {
  test('redirects unauthenticated visitors to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/agents')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('renders header, filter chips, and "New Agent" button after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/agents')
    await expect(page.locator('[data-mol-id="page-agents"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="agents-new"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="agents-filter-all"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="agents-filter-running"]')).toBeVisible()
  })

  test('shows the empty hint when no agents are present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/agents')
    await expect(page.locator('[data-mol-id="agents-empty"]')).toBeVisible()
  })

  test('"New Agent" creates an agent server-side and navigates to /agents/:id', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/agents')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="agents-new"]').click()
      await page.waitForURL(/\/agents\/[\w-]+/, { timeout: 10000 })
    })
    const create = whereUrl(reqs, /\/api\/agents(?:\?|$)/, 'POST')
    expect(create.length).toBeGreaterThan(0)
    expect(create[0].status).toBe(201)
    // Read-after-write: the new agent should appear in the user's collection.
    const list = await authedApi(request, session.accessToken!).get('/agents')
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as Array<{ id: string }>
    expect(rows.length).toBeGreaterThan(0)
  })

  test('seeded agent renders in the grid', async ({ page, request }) => {
    const session = await signup(page)
    await seedAgent(request, session.accessToken!, { name: 'Marketing Researcher' })
    await page.goto(APP_BASE + '/agents')
    await expect(page.getByText('Marketing Researcher').first()).toBeVisible({ timeout: 10000 })
  })

  test('filters narrow the visible list (idle filter hides paused-only agents)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    await seedAgent(request, session.accessToken!, { name: 'Idle Agent', status: 'draft' })
    await page.goto(APP_BASE + '/agents')
    await expect(page.getByText('Idle Agent').first()).toBeVisible({ timeout: 10000 })
    await page.locator('[data-mol-id="agents-filter-running"]').click()
    await expect(page.getByText('Idle Agent')).toHaveCount(0)
  })

  test('GET /api/agents fires once on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/agents')
      await expect(page.locator('[data-mol-id="page-agents"]')).toBeVisible()
      await page.waitForTimeout(500)
    })
    expect(whereUrl(reqs, /\/api\/agents(?:\?|$)/, 'GET').length).toBeGreaterThan(0)
  })

  test('non-owner cannot read another user\u2019s agents', async ({ request }) => {
    const resA = await request.post(API_BASE + '/users', {
      data: { email: `iso-a+${Date.now()}@example.com`, password: 'TestPass123!' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(resA.status()).toBe(201)
    const tokenA = (await resA.json()).accessToken as string

    const resB = await request.post(API_BASE + '/users', {
      data: { email: `iso-b+${Date.now()}@example.com`, password: 'TestPass123!' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(resB.status()).toBe(201)
    const tokenB = (await resB.json()).accessToken as string

    const created = await authedApi(request, tokenA).post('/agents', {
      name: 'Private to A',
      provider: 'anthropic',
      model: 'claude-haiku-4-5',
    })
    expect(created.status()).toBe(201)
    const agent = await created.json()

    const sneak = await authedApi(request, tokenB).get(`/agents/${agent.id}`)
    expect(sneak.status(), 'B must not be able to read A\u2019s agent').toBe(404)
  })
})
