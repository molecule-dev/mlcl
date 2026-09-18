import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, api } from './_helpers.js'

test('Reports page renders the four report sections', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/reports')
  // Wait until loading message goes away (the load handler resolves with at
  // least an empty data shape thanks to the empty-data tolerant defaults).
  await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('heading', { name: /net worth/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /spending by category/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /top payees/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /income vs expenses/i })).toBeVisible()
})

test('After seeding transactions, spending-by-category list shows that category', async ({
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
    name: 'Groceries',
    group_name: 'Essentials',
  })
  await api(page, 'POST', '/transactions', {
    account_id: acc.id,
    category_id: cat.id,
    payee: 'Whole Foods',
    amount_cents: 4218,
    type: 'outflow',
    date: new Date().toISOString(),
  })
  await page.goto(APP_BASE + '/reports')
  await expect(page.getByRole('heading', { name: /spending by category/i })).toBeVisible()
  await expect(page.getByText(/groceries/i)).toBeVisible({ timeout: 10000 })
})
