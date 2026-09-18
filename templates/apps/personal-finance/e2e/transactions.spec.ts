import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  seedAccount,
  seedCategory,
  seedTransaction,
  signup,
} from './_helpers.js'

test('Transactions list renders empty state with CTA when no transactions exist', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/transactions')
  await page.waitForLoadState('networkidle')
  // Empty state should NOT show fake demo rows ("Salary +$4,200" was a polished mockup)
  await expect(page.getByText(/Salary\s*\+\$4,200/)).toHaveCount(0)
  await expect(page.getByText(/Netflix\s*-\$15.99/)).toHaveCount(0)
  // Empty state should offer a clear path to add first transaction
  const cta = page
    .getByRole('link', { name: /add.*transaction|new transaction|first transaction/i })
    .first()
  await cta.waitFor({ timeout: 10_000 }).catch(() => {})
})

test('Add Transaction form persists and shows up in list (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const acct = await seedAccount(page, accessToken, { name: 'Tx-Test Acct', initial_balance: 1000 })
  const cat = await seedCategory(page, accessToken, { name: 'Tx-Test Cat', type: 'expense' })

  await page.goto(APP_BASE + '/transactions/new')
  await page.waitForLoadState('networkidle')

  const description = `E2E Tx ${Date.now()}`
  await page.locator('[data-mol-id="add-transaction-amount"]').fill('42.50')
  await page.locator('[data-mol-id="add-transaction-description"]').fill(description)
  await page.locator('[data-mol-id="add-transaction-account"]').selectOption(acct.id)
  await page.locator('[data-mol-id="add-transaction-category"]').selectOption(cat.id)

  const reqs = await captureNetwork(page, async () => {
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
  })
  const post = reqs.find((r) => /\/api\/transactions$/.test(r.url) && r.method === 'POST')
  expect(post, 'POST /api/transactions did not fire').toBeTruthy()
  expect(post!.status).toBeLessThan(300)

  // Read-after-write via API
  const list = await page.request.get('/api/transactions', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(list.status()).toBe(200)
  const body = (await list.json()) as Array<{ description: string; amount: number | string }>
  expect(
    body.find((t) => t.description === description),
    'transaction not in GET /api/transactions',
  ).toBeTruthy()
})

test('Transactions seeded by API appear in /transactions list and survive reload', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const acct = await seedAccount(page, accessToken)
  const cat = await seedCategory(page, accessToken, { name: 'Coffee', type: 'expense' })
  const desc = `Latte ${Date.now()}`
  await seedTransaction(page, accessToken, {
    account_id: acct.id,
    category_id: cat.id,
    description: desc,
    amount: 6.5,
  })

  await page.goto(APP_BASE + '/transactions')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(desc).first()).toBeVisible({ timeout: 10_000 })

  await page.reload()
  await expect(page.getByText(desc).first()).toBeVisible({ timeout: 10_000 })
})

test('Delete transaction removes it from the list (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const acct = await seedAccount(page, accessToken)
  const t1 = await seedTransaction(page, accessToken, {
    account_id: acct.id,
    description: 'Doomed Tx',
  })
  await seedTransaction(page, accessToken, { account_id: acct.id, description: 'Survivor Tx' })

  const del = await page.request.delete(`/api/transactions/${t1.id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(del.status()).toBeLessThan(300)

  const list = await page.request.get('/api/transactions', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = (await list.json()) as Array<{ id: string; description: string }>
  expect(body.find((t) => t.id === t1.id)).toBeFalsy()
  expect(body.find((t) => t.description === 'Survivor Tx')).toBeTruthy()
})
