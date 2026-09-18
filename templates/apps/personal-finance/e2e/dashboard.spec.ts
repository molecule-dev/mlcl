import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, seedAccount, seedCategory, seedTransaction, signup } from './_helpers.js'

test('Dashboard renders for empty user without leaked design-mockup numbers', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/')
  await page.waitForLoadState('networkidle')
  // Polished mockup leaked "1,247,832.40" type numbers; assert none of them.
  await expect(page.getByText(/1,247,832\.40/)).toHaveCount(0)
  await expect(page.getByText(/Hawaii Vacation/i)).toHaveCount(0)
})

test('Dashboard reflects real seeded data (net worth = sum of seeded balances)', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  await seedAccount(page, accessToken, {
    name: 'Acme Checking',
    initial_balance: 10000,
    type: 'checking',
  })
  await seedAccount(page, accessToken, {
    name: 'Acme Savings',
    initial_balance: 5000,
    type: 'savings',
  })

  await page.goto(APP_BASE + '/')
  await page.waitForLoadState('networkidle')

  const accountsRes = await page.request.get('/api/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const accounts = (await accountsRes.json()) as Array<{ name: string; balance: number | string }>
  const total = accounts.reduce((s, a) => s + Number(a.balance), 0)
  expect(total).toBe(15000)

  // Account names should appear (or net-worth line should render).
  // The dashboard shows one or both account names; assert at least one.
  // innerText() is a one-shot read with no auto-waiting and there is no wait
  // before it, so it can sample the page before the accounts render. toContainText
  // retries until the content is really there (same defect that failed
  // team-chat's privacy/terms/signup/dashboard specs outright under load).
  await expect(page.locator('body')).toContainText(/Acme Checking|Acme Savings|15,000|\$15,000\.00/)
})

test('Recent transactions appear on dashboard after seeding', async ({ page }) => {
  const { accessToken } = await signup(page)
  const acct = await seedAccount(page, accessToken, { name: 'Dash-Tx-Acct' })
  const cat = await seedCategory(page, accessToken, { name: 'Recurring', type: 'expense' })
  const desc = `DashTx ${Date.now()}`
  await seedTransaction(page, accessToken, {
    account_id: acct.id,
    category_id: cat.id,
    description: desc,
    amount: 12.34,
  })

  await page.goto(APP_BASE + '/')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(desc).first()).toBeVisible({ timeout: 10_000 })
})
