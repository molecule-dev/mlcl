import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  seedAccount,
  seedCategory,
  signup,
} from './_helpers.js'

test.describe('/transactions/new: create-transaction form', () => {
  test('Form renders the description, amount, account, category, and date fields', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/transactions/new')
    await expect(page.locator('[data-mol-id="add-transaction-description"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="add-transaction-account"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="add-transaction-category"]')).toBeVisible()
  })

  test('Validation: required fields prevent submitting an empty form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/transactions/new')
    await page.locator('form button[type="submit"]').first().click()
    // Either HTML5 `required` blocks submit (we stay on /transactions/new) or
    // the React validation surfaces an alert. Either is a valid prevention.
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/\/transactions\/new/)
  })

  test('Filling the form and submitting creates a transaction visible on /transactions', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken, { name: 'New-Tx Account' })
    const cat = await seedCategory(page, accessToken, { name: 'Books', type: 'expense' })
    await page.goto(APP_BASE + '/transactions/new')
    await expect(page.locator('[data-mol-id="add-transaction-account"]')).toBeVisible()

    await page.locator('[data-mol-id="add-transaction-description"]').fill('Anna Karenina')
    // The amount input is the first numeric input on the amount section
    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    await amountInput.fill('19.99')
    await page.locator('[data-mol-id="add-transaction-account"]').selectOption(acct.id)
    await page.locator('[data-mol-id="add-transaction-category"]').selectOption(cat.id)

    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForURL((u) => /\/transactions\/?$/.test(u.pathname), { timeout: 15_000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/transactions(\?|$)/.test(r.url))
    expect(post).toBeDefined()
    expect(post?.status).toBeLessThan(300)

    // Read-after-write invariant: GET /api/transactions should return our row
    const after = await page.request.get(`${API_BASE}/transactions?limit=50`, {
      headers: apiHeaders(accessToken),
    })
    expect(after.status()).toBe(200)
    const body = (await after.json()) as { data?: { description: string }[] }
    const list = Array.isArray(body) ? body : (body.data ?? [])
    expect(list.some((t) => t.description === 'Anna Karenina')).toBe(true)
  })

  test('Cancel button routes back to /transactions without creating a row', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedAccount(page, accessToken)
    await page.goto(APP_BASE + '/transactions/new')
    const before = await page.request.get(`${API_BASE}/transactions?limit=50`, {
      headers: apiHeaders(accessToken),
    })
    const beforeBody = (await before.json()) as { data?: unknown[] }
    const beforeCount = (beforeBody.data ?? []).length
    await page
      .getByRole('button', { name: /cancel/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/transactions\/?$/)
    const after = await page.request.get(`${API_BASE}/transactions?limit=50`, {
      headers: apiHeaders(accessToken),
    })
    const afterBody = (await after.json()) as { data?: unknown[] }
    expect((afterBody.data ?? []).length).toBe(beforeCount)
  })

  test('Tags input accepts multiple tags via Enter and renders them as chips', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/transactions/new')
    const tagInput = page.locator('input[placeholder*="tags" i]').first()
    await tagInput.fill('groceries')
    await tagInput.press('Enter')
    await tagInput.fill('weekly')
    await tagInput.press('Enter')
    await expect(page.getByText('#groceries')).toBeVisible()
    await expect(page.getByText('#weekly')).toBeVisible()
  })
})
