import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, api } from './_helpers.js'

test('Add account button toggles the New account form', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/accounts')
  await expect(page.locator('input[name="name"]')).toHaveCount(0)
  await page.getByRole('button', { name: /add account/i }).click()
  await expect(page.locator('input[name="name"]')).toBeVisible()
  await page.getByRole('button', { name: /^cancel$/i }).click()
  await expect(page.locator('input[name="name"]')).toHaveCount(0)
})

test('Submitting the New account form creates a real account row visible on reload', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/accounts')
  await page.getByRole('button', { name: /add account/i }).click()
  const reqs = await captureNetwork(page, async () => {
    await page.locator('input[name="name"]').fill('Wells Checking')
    await page.locator('select[name="type"]').selectOption('checking')
    await page.locator('input[name="institution"]').fill('Wells Fargo')
    await page.locator('input[name="mask"]').fill('4321')
    await page.locator('input[name="balance"]').fill('1500.50')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.getByText('Wells Checking')).toBeVisible({ timeout: 10000 })
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/accounts/.test(r.url))
  expect(post?.status, 'POST /api/accounts must succeed').toBeLessThan(300)
  // Read-after-write: GET /api/accounts returns the new row
  const accounts = await api<Array<Record<string, unknown>>>(page, 'GET', '/accounts')
  const created = accounts.find((a) => a.name === 'Wells Checking')
  expect(created).toBeDefined()
  expect(created?.balance_cents).toBe(150050)
  // Persist across reload
  await page.reload()
  await expect(page.getByText('Wells Checking')).toBeVisible()
  // The line item and the group total both render the same balance; assert at
  // least one $1500.50 exists.
  await expect(page.getByText('$1500.50').first()).toBeVisible()
})

test('Account list groups by on_budget vs tracking', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/accounts', {
    name: 'Wells Checking',
    type: 'checking',
    balance_cents: 100000,
    on_budget: true,
  })
  await api(page, 'POST', '/accounts', {
    name: 'Vanguard Brokerage',
    type: 'investment',
    balance_cents: 5000000,
    on_budget: false,
  })
  await page.goto(APP_BASE + '/accounts')
  await expect(page.getByRole('heading', { name: /on budget/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /tracking/i })).toBeVisible()
  // Use role=link to scope to the actual account rows (avoids matching the
  // type label "Checking" inside another row's metadata).
  await expect(page.getByRole('link', { name: /wells checking/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /vanguard brokerage/i })).toBeVisible()
})

test('Clicking an account row navigates to /accounts/:id detail', async ({ page }) => {
  await signup(page)
  const acc = await api<Record<string, string>>(page, 'POST', '/accounts', {
    name: 'Tap Me',
    type: 'checking',
    balance_cents: 50000,
    on_budget: true,
  })
  await page.goto(APP_BASE + '/accounts')
  await page.getByRole('link', { name: /tap me/i }).click()
  await expect(page).toHaveURL(new RegExp(`/accounts/${acc.id}`))
})

test('Empty state shows when no accounts exist', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/accounts')
  await expect(page.getByText(/no accounts yet/i)).toBeVisible()
})
