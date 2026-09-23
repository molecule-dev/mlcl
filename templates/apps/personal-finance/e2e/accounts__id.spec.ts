import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  seedAccount,
  seedCategory,
  seedTransaction,
  signup,
} from './_helpers.js'

test.describe('/accounts/:id: account detail page', () => {
  test('Loading a real account renders its header (name + institution + balance)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken, {
      name: 'Atelier Checking',
      institution: 'Curator Bank',
      initial_balance: 4242,
    })
    await page.goto(APP_BASE + `/accounts/${acct.id}`)
    await expect(page.getByText('Atelier Checking').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Curator Bank/i).first()).toBeVisible()
  })

  test('Recent transactions list shows seeded transactions for the account', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken, { name: 'Detail-Tx Account' })
    const cat = await seedCategory(page, accessToken, { name: 'Espresso', type: 'expense' })
    await seedTransaction(page, accessToken, {
      account_id: acct.id,
      category_id: cat.id,
      amount: 12.34,
      description: 'Sumatra pour-over',
    })
    await page.goto(APP_BASE + `/accounts/${acct.id}`)
    await expect(page.getByText('Sumatra pour-over').first()).toBeVisible({ timeout: 10_000 })
  })

  test('Loading account detail fires GET /api/accounts/:id and GET /api/transactions?account_id', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/accounts/${acct.id}`)
      await page.waitForLoadState('networkidle')
    })
    const accountReq = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/accounts/${acct.id}`).test(r.url),
    )
    const txReq = reqs.find(
      (r) =>
        r.method === 'GET' &&
        /\/api\/transactions/.test(r.url) &&
        new RegExp(`account_id=${acct.id}`).test(r.url),
    )
    expect(accountReq).toBeDefined()
    expect(accountReq?.status).toBeLessThan(300)
    expect(txReq).toBeDefined()
    expect(txReq?.status).toBeLessThan(300)
  })

  test('Unknown account id surfaces the not-found state with Back to Accounts CTA', async ({
    page,
  }) => {
    // The unknown id legitimately 404s; the fetch logs to the browser console.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 404',
    })
    await signup(page)
    await page.goto(APP_BASE + '/accounts/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText(/Account not found/i)).toBeVisible({ timeout: 10_000 })
    const back = page.getByRole('link', { name: /back to accounts/i }).first()
    await expect(back).toBeVisible()
    await back.click()
    await expect(page).toHaveURL(/\/accounts\/?$/)
  })

  test('FAB navigates to /transactions/new with the accountId query', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    await page.goto(APP_BASE + `/accounts/${acct.id}`)
    await expect(page.getByRole('heading', { name: acct.name }).first()).toBeVisible({
      timeout: 10_000,
    })
    // The Quick-Add FAB is fixed bottom-right with a Material "add" glyph
    const fab = page.locator('div.fixed.bottom-10.right-10 button').first()
    await fab.click()
    await expect(page).toHaveURL(new RegExp(`/transactions/new\\?accountId=${acct.id}`))
  })
})
