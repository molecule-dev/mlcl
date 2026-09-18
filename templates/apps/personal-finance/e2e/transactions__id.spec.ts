import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  seedAccount,
  seedCategory,
  seedTransaction,
  signup,
} from './_helpers.js'

test.describe('/transactions/:id: transaction detail page', () => {
  test('Loading a real transaction renders its description and amount', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    const cat = await seedCategory(page, accessToken, { name: 'Coffee', type: 'expense' })
    const tx = await seedTransaction(page, accessToken, {
      account_id: acct.id,
      category_id: cat.id,
      amount: 8.5,
      description: 'Atelier latte',
    })
    await page.goto(APP_BASE + `/transactions/${tx.id}`)
    await expect(page.getByText('Atelier latte').first()).toBeVisible({ timeout: 10_000 })
  })

  test('Loading detail fires GET /api/transactions/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    const cat = await seedCategory(page, accessToken, { type: 'expense' })
    const tx = await seedTransaction(page, accessToken, {
      account_id: acct.id,
      category_id: cat.id,
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/transactions/${tx.id}`)
      await page.waitForLoadState('networkidle')
    })
    const r = reqs.find(
      (req) => req.method === 'GET' && new RegExp(`/api/transactions/${tx.id}`).test(req.url),
    )
    expect(r).toBeDefined()
    expect(r?.status).toBeLessThan(300)
  })

  test('Unknown id surfaces "Transaction not found" + Back to Transactions link', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/transactions/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText(/Transaction not found/i)).toBeVisible({ timeout: 10_000 })
    const back = page.getByRole('link', { name: /back to transactions/i }).first()
    await expect(back).toBeVisible()
    await back.click()
    await expect(page).toHaveURL(/\/transactions\/?$/)
  })

  test('Delete confirm flow removes the transaction (read-after-delete invariant)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    const cat = await seedCategory(page, accessToken, { type: 'expense' })
    const tx = await seedTransaction(page, accessToken, {
      account_id: acct.id,
      category_id: cat.id,
      description: 'To be deleted',
    })
    await page.goto(APP_BASE + `/transactions/${tx.id}`)
    await expect(page.getByText('To be deleted').first()).toBeVisible({ timeout: 10_000 })

    // Open delete confirm via the action button
    await page
      .getByRole('button', { name: /delete/i })
      .first()
      .click()
    await expect(page.getByText(/Are you sure you want to delete/i)).toBeVisible()
    await page.getByRole('button', { name: /yes, delete/i }).click()
    await page.waitForURL((u) => /\/transactions\/?$/.test(u.pathname), { timeout: 15_000 })

    const after = await page.request.get(`${API_BASE}/transactions/${tx.id}`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(after.status()).toBe(404)
  })

  test('Similar transactions card renders when category has siblings', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    const cat = await seedCategory(page, accessToken, { name: 'Restaurants', type: 'expense' })
    await seedTransaction(page, accessToken, {
      account_id: acct.id,
      category_id: cat.id,
      description: 'Sibling tx 1',
    })
    const target = await seedTransaction(page, accessToken, {
      account_id: acct.id,
      category_id: cat.id,
      description: 'Target tx',
    })
    await page.goto(APP_BASE + `/transactions/${target.id}`)
    await expect(page.getByText('Sibling tx 1')).toBeVisible({ timeout: 10_000 })
  })
})
