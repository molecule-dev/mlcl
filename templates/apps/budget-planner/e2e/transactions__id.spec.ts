import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, api } from './_helpers.js'

async function seed(page: any) {
  const acc = await api<Record<string, string>>(page, 'POST', '/accounts', {
    name: 'Wells Checking',
    type: 'checking',
    balance_cents: 100000,
    on_budget: true,
  })
  const cat = await api<Record<string, string>>(page, 'POST', '/categories', {
    name: 'Groceries',
    group_name: 'Essentials',
  })
  const tx = await api<Record<string, string>>(page, 'POST', '/transactions', {
    account_id: acc.id,
    category_id: cat.id,
    payee: 'Whole Foods',
    amount_cents: 4218,
    type: 'outflow',
    date: new Date().toISOString(),
    memo: 'Original',
  })
  return { acc, cat, tx }
}

test('Detail page shows payee, amount, date and back link', async ({ page }) => {
  await signup(page)
  const { tx } = await seed(page)
  await page.goto(APP_BASE + '/transactions/' + tx.id)
  await expect(page.getByRole('heading', { name: /whole foods/i })).toBeVisible()
  await expect(page.getByText(/-?\$42\.18/)).toBeVisible()
  await expect(page.getByRole('link', { name: /back to transactions/i })).toBeVisible()
})

test('Edit → Save persists to PUT /api/transactions/:id and updates the UI', async ({ page }) => {
  await signup(page)
  const { tx } = await seed(page)
  await page.goto(APP_BASE + '/transactions/' + tx.id)
  await page.getByTestId('tx-edit').click()
  // Update payee + memo
  const inputs = page.locator('input').filter({ hasText: '' })
  await page.locator('input').nth(0).fill('Whole Foods Market')
  await page.locator('input').nth(3).fill('Updated memo')
  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('tx-save').click()
    await expect(page.getByRole('heading', { name: /whole foods market/i })).toBeVisible({
      timeout: 10000,
    })
  })
  const put = reqs.find(
    (r) => r.method === 'PUT' && new RegExp(`/api/transactions/${tx.id}`).test(r.url),
  )
  expect(put?.status).toBeLessThan(300)
  const refreshed = await api<Record<string, string>>(page, 'GET', `/transactions/${tx.id}`)
  expect(refreshed.payee).toBe('Whole Foods Market')
})

test('Delete tx removes it from list and navigates back to /transactions', async ({ page }) => {
  await signup(page)
  const { tx } = await seed(page)
  await page.goto(APP_BASE + '/transactions/' + tx.id)
  page.once('dialog', (d) => d.accept())
  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('tx-delete').click()
    await expect(page).toHaveURL(/\/transactions(?!\/[0-9a-f-]+)/, { timeout: 10000 })
  })
  const del = reqs.find((r) => r.method === 'DELETE' && /\/api\/transactions\//.test(r.url))
  expect(del?.status).toBeLessThan(400)
  const list = await api<Array<Record<string, unknown>>>(page, 'GET', '/transactions')
  expect(list.find((t) => (t as any).id === tx.id)).toBeUndefined()
})

test('Visiting unknown id shows not-found state with back link', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/transactions/00000000-0000-0000-0000-000000000000')
  await expect(page.getByText(/transaction not found/i)).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('link', { name: /back to transactions/i })).toBeVisible()
})
