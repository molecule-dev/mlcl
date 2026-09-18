import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, api } from './_helpers.js'

test('Add transaction form renders all required fields', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/transactions/new')
  await expect(page.locator('input[name="date"]')).toBeVisible()
  await expect(page.locator('select[name="account_id"]')).toBeVisible()
  await expect(page.locator('input[name="payee"]')).toBeVisible()
  await expect(page.locator('select[name="category_id"]')).toBeVisible()
  await expect(page.locator('select[name="type"]')).toBeVisible()
  await expect(page.locator('input[name="amount"]')).toBeVisible()
  await expect(page.locator('input[name="memo"]')).toBeVisible()
})

test('Empty-amount or zero-amount blocks submission with inline error', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/accounts', {
    name: 'Default',
    type: 'checking',
    balance_cents: 0,
    on_budget: true,
  })
  await page.goto(APP_BASE + '/transactions/new')
  await page.locator('input[name="payee"]').fill('Empty Amount')
  await page.getByRole('button', { name: /save transaction/i }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/transactions\/new/)
})

test('Submitting a valid outflow creates the tx via POST /api/transactions and navigates to /transactions', async ({
  page,
}) => {
  await signup(page)
  const acc = await api<Record<string, string>>(page, 'POST', '/accounts', {
    name: 'Wells Checking',
    type: 'checking',
    balance_cents: 100000,
    on_budget: true,
  })
  const cat = await api<Record<string, string>>(page, 'POST', '/categories', {
    name: 'Coffee',
    group_name: 'Discretionary',
  })
  await page.goto(APP_BASE + '/transactions/new')
  // The first <option> is the placeholder; pick by value.
  await page.locator('select[name="account_id"]').selectOption(acc.id)
  await page.locator('input[name="payee"]').fill('Blue Bottle')
  await page.locator('select[name="category_id"]').selectOption(cat.id)
  await page.locator('select[name="type"]').selectOption('outflow')
  await page.locator('input[name="amount"]').fill('5.75')
  await page.locator('input[name="memo"]').fill('Latte')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /save transaction/i }).click()
    await expect(page).toHaveURL(/\/transactions(?!\/new)/, { timeout: 10000 })
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/transactions(\?|$)/.test(r.url))
  expect(post?.status, 'POST /api/transactions must succeed').toBeLessThan(300)
  // Verify backend invariant — the row exists for this user
  const list = await api<Array<Record<string, unknown>>>(page, 'GET', '/transactions')
  const tx = list.find((t) => (t as any).payee === 'Blue Bottle')
  expect(tx).toBeDefined()
  expect((tx as any).amount_cents).toBe(-575)
})

test('Cancel link returns to /transactions without creating anything', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/transactions/new')
  await page.getByRole('link', { name: /^cancel$/i }).click()
  await expect(page).toHaveURL(/\/transactions(?!\/new)/)
  const list = await api<Array<Record<string, unknown>>>(page, 'GET', '/transactions')
  expect(list).toHaveLength(0)
})
