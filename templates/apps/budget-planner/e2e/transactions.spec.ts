import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, api } from './_helpers.js'

async function seedAccount(page: any) {
  return await api<Record<string, string>>(page, 'POST', '/accounts', {
    name: 'Wells Checking',
    type: 'checking',
    balance_cents: 100000,
    on_budget: true,
  })
}

async function seedCategory(page: any) {
  return await api<Record<string, string>>(page, 'POST', '/categories', {
    name: 'Groceries',
    group_name: 'Essentials',
  })
}

async function seedTx(
  page: any,
  accountId: string,
  categoryId: string | null,
  payee: string,
  cents: number,
) {
  return await api<Record<string, unknown>>(page, 'POST', '/transactions', {
    account_id: accountId,
    category_id: categoryId,
    payee,
    amount_cents: Math.abs(cents),
    type: cents >= 0 ? 'inflow' : 'outflow',
    date: new Date().toISOString(),
  })
}

test('Transactions page renders Add transaction CTA + Import link', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/transactions')
  await expect(page.getByRole('link', { name: /add transaction/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /^import$/i })).toBeVisible()
})

test('Empty state shows "No transactions match" when none exist', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/transactions')
  await expect(page.getByText(/no transactions/i)).toBeVisible()
})

test('Created transaction appears in the list after reload', async ({ page }) => {
  await signup(page)
  const acc = await seedAccount(page)
  const cat = await seedCategory(page)
  await seedTx(page, acc.id, cat.id, 'Whole Foods', -4218)
  await page.goto(APP_BASE + '/transactions')
  await expect(page.getByText('Whole Foods')).toBeVisible()
  await expect(page.getByText(/-?\$42\.18/)).toBeVisible()
})

test('Search filter narrows the list to matching payee', async ({ page }) => {
  await signup(page)
  const acc = await seedAccount(page)
  const cat = await seedCategory(page)
  await seedTx(page, acc.id, cat.id, 'Whole Foods', -4218)
  await seedTx(page, acc.id, cat.id, 'Trader Joes', -1500)
  await page.goto(APP_BASE + '/transactions')
  await expect(page.getByText('Whole Foods')).toBeVisible()
  await expect(page.getByText('Trader Joes')).toBeVisible()
  await page.locator('input[type="search"]').fill('Whole')
  await expect(page.getByText('Whole Foods')).toBeVisible()
  await expect(page.getByText('Trader Joes')).toHaveCount(0)
})

test('Add transaction button navigates to /transactions/new', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/transactions')
  await page.getByRole('link', { name: /add transaction/i }).click()
  await expect(page).toHaveURL(/\/transactions\/new/)
  await expect(page.getByRole('heading', { name: /add transaction/i })).toBeVisible()
})
