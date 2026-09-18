import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, api } from './_helpers.js'

test('Dashboard renders heading + KPI cards (Income/Assigned/Spent/Available)', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await expect(page.getByText(/this month/i).first()).toBeVisible()
  await expect(page.getByText(/income/i).first()).toBeVisible()
  await expect(page.getByText(/assigned/i).first()).toBeVisible()
  await expect(page.getByText(/spent/i).first()).toBeVisible()
  await expect(page.getByText(/available/i).first()).toBeVisible()
})

test('Open budget button navigates to /budget', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page.getByRole('link', { name: /open budget/i }).click()
  await expect(page).toHaveURL(/\/budget/)
})

test('Recent transactions list shows the most recent tx for the user', async ({ page }) => {
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
  await api(page, 'POST', '/transactions', {
    account_id: acc.id,
    category_id: cat.id,
    payee: 'Blue Bottle Coffee',
    amount_cents: 575,
    type: 'outflow',
    date: new Date().toISOString(),
  })
  await page.goto(APP_BASE + '/dashboard')
  await expect(page.getByText(/blue bottle coffee/i)).toBeVisible({ timeout: 10000 })
})

test('Dashboard "All →" link navigates to /transactions', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page.getByRole('link', { name: /^all →$/i }).click()
  await expect(page).toHaveURL(/\/transactions(?!\/)/)
})
