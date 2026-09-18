import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, api } from './_helpers.js'

test('Account detail loads name + balance + back link', async ({ page }) => {
  await signup(page)
  const acc = await api<Record<string, string>>(page, 'POST', '/accounts', {
    name: 'Detail Account',
    type: 'checking',
    balance_cents: 250000,
    on_budget: true,
  })
  await page.goto(APP_BASE + `/accounts/${acc.id}`)
  await expect(page.getByRole('heading', { name: /detail account/i })).toBeVisible()
  await expect(page.getByTestId('account-balance')).toContainText('2500.00')
  await expect(page.getByRole('link', { name: /all accounts/i })).toBeVisible()
})

test('Edit button opens form, Save persists changes across reload', async ({ page }) => {
  await signup(page)
  const acc = await api<Record<string, string>>(page, 'POST', '/accounts', {
    name: 'Pre-Edit',
    type: 'checking',
    balance_cents: 100000,
    on_budget: true,
  })
  await page.goto(APP_BASE + `/accounts/${acc.id}`)
  await page.getByTestId('account-edit').click()
  await expect(page.getByRole('heading', { name: /edit account/i })).toBeVisible()
  const reqs = await captureNetwork(page, async () => {
    await page.locator('input').first().fill('Renamed Account')
    await page.getByTestId('account-save').click()
    await expect(page.getByRole('heading', { name: /renamed account/i })).toBeVisible({
      timeout: 10000,
    })
  })
  const put = reqs.find((r) => r.method === 'PUT' && /\/api\/accounts\//.test(r.url))
  expect(put?.status).toBeLessThan(300)
  await page.reload()
  await expect(page.getByRole('heading', { name: /renamed account/i })).toBeVisible()
  // GET-after-PUT confirms persistence
  const after = await api<Record<string, string>>(page, 'GET', `/accounts/${acc.id}`)
  expect(after.name).toBe('Renamed Account')
})

test('Delete account removes it (DELETE 204) and navigates back to /accounts', async ({ page }) => {
  await signup(page)
  const acc = await api<Record<string, string>>(page, 'POST', '/accounts', {
    name: 'Delete Me',
    type: 'checking',
    balance_cents: 0,
    on_budget: true,
  })
  await page.goto(APP_BASE + `/accounts/${acc.id}`)
  await page.getByTestId('account-edit').click()
  page.once('dialog', (dialog) => dialog.accept())
  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('account-delete').click()
    await expect(page).toHaveURL(/\/accounts$/, { timeout: 10000 })
  })
  const del = reqs.find((r) => r.method === 'DELETE' && /\/api\/accounts\//.test(r.url))
  expect(del?.status).toBe(204)
  // GET 404 confirms it's gone
  const list = await api<Array<Record<string, string>>>(page, 'GET', '/accounts')
  expect(list.find((a) => a.id === acc.id)).toBeUndefined()
})

test('Account ledger shows transactions linked to this account', async ({ page }) => {
  await signup(page)
  const acc = await api<Record<string, string>>(page, 'POST', '/accounts', {
    name: 'Ledger Test',
    type: 'checking',
    balance_cents: 100000,
    on_budget: true,
  })
  const cat = await api<Record<string, string>>(page, 'POST', '/categories', {
    name: 'Food',
    group_name: 'Essentials',
  })
  await api(page, 'POST', '/transactions', {
    account_id: acc.id,
    date: '2026-05-09',
    payee: "Joe's Coffee",
    amount: -8.5,
    category_id: cat.id,
  })
  await page.goto(APP_BASE + `/accounts/${acc.id}`)
  await expect(page.getByText("Joe's Coffee")).toBeVisible()
  await expect(page.getByTestId('account-balance')).toContainText('991.50')
})

test('Clicking a transaction row in account ledger navigates to /transactions/:id', async ({
  page,
}) => {
  await signup(page)
  const acc = await api<Record<string, string>>(page, 'POST', '/accounts', {
    name: 'Nav Test',
    type: 'checking',
    balance_cents: 100000,
    on_budget: true,
  })
  const tx = await api<Record<string, string>>(page, 'POST', '/transactions', {
    account_id: acc.id,
    date: '2026-05-09',
    payee: 'Click Test',
    amount: -10.0,
  })
  await page.goto(APP_BASE + `/accounts/${acc.id}`)
  await page.getByTestId(`tx-row-${tx.id}`).click()
  await expect(page).toHaveURL(new RegExp(`/transactions/${tx.id}`))
})
