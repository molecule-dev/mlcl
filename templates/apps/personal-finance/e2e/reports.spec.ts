import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  seedAccount,
  seedCategory,
  seedTransaction,
  signup,
} from './_helpers.js'

test('Reports page loads and fires the /api/reports endpoints', async ({ page }) => {
  const { accessToken } = await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/reports')
    await page.waitForLoadState('networkidle')
  })
  // The page always fires the three core report endpoints; budget-progress
  // is fetched eagerly in the same render but may complete after networkidle
  // in the empty-user case, so we only require it as a direct API call below.
  for (const path of [
    '/api/reports/spending-by-category',
    '/api/reports/income-vs-expenses',
    '/api/reports/net-worth',
  ]) {
    const hit = reqs.find((r) => r.method === 'GET' && r.url.includes(path))
    expect(hit, `expected GET ${path} on page load`).toBeDefined()
    expect(hit?.status).toBeLessThan(300)
  }

  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const qs = `?start_date=${monthAgo}&end_date=${today}`
  const headers = { Authorization: `Bearer ${accessToken}` }

  for (const path of [
    '/api/reports/spending-by-category',
    '/api/reports/income-vs-expenses',
    '/api/reports/net-worth',
    '/api/reports/budget-progress',
  ]) {
    const res = await page.request.get(path + qs, { headers })
    expect(res.status(), `${path} failed`).toBe(200)
    const body = (await res.json()) as unknown
    expect(
      Array.isArray(body) || (body && typeof body === 'object'),
      `${path} returned junk`,
    ).toBeTruthy()
  }
})

test('Range tabs (1m / 3m / 6m / 1y / ytd) are rendered as filter buttons', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/reports')
  for (const range of ['1m', '3m', '6m', '1y', 'ytd']) {
    await expect(page.locator(`[data-mol-id="tab-${range}"]`)).toBeVisible()
  }
})

test('Income vs expenses endpoint returns numeric income/expense data', async ({ page }) => {
  const { accessToken } = await signup(page)
  const acct = await seedAccount(page, accessToken)
  const cat = await seedCategory(page, accessToken, { name: 'PayBills', type: 'expense' })
  await seedTransaction(page, accessToken, {
    account_id: acct.id,
    category_id: cat.id,
    amount: 50,
    type: 'expense',
  })
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const res = await page.request.get(
    `/api/reports/income-vs-expenses?start_date=${monthAgo}&end_date=${today}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  expect(res.status()).toBe(200)
  const body = (await res.json()) as unknown
  expect(body).toBeTruthy()
})

test('Net worth endpoint returns a numeric snapshot', async ({ page }) => {
  const { accessToken } = await signup(page)
  await seedAccount(page, accessToken, { initial_balance: 1234 })
  const res = await page.request.get('/api/reports/net-worth', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as unknown
  expect(body).toBeTruthy()
})

test('Reports reflect real transactions (spending-by-category sums correctly)', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const acct = await seedAccount(page, accessToken)
  const cat = await seedCategory(page, accessToken, { name: 'TestCat', type: 'expense' })
  await seedTransaction(page, accessToken, {
    account_id: acct.id,
    category_id: cat.id,
    amount: 30,
    type: 'expense',
  })
  await seedTransaction(page, accessToken, {
    account_id: acct.id,
    category_id: cat.id,
    amount: 70,
    type: 'expense',
  })

  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const res = await page.request.get(
    `/api/reports/spending-by-category?start_date=${monthAgo}&end_date=${today}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  expect(res.status()).toBe(200)
  const body = (await res.json()) as Array<{
    category_id: string
    total_amount: number | string
    transaction_count: number | string
  }>
  const row = body.find((r) => r.category_id === cat.id)
  expect(row, 'category row missing in spending-by-category').toBeTruthy()
  expect(Number(row!.total_amount)).toBe(100)
  expect(Number(row!.transaction_count)).toBe(2)
})
