/**
 * /expenses/new — manual expense capture form (date / merchant / category /
 * amount / deductible / notes / receipt drop area), POST /api/expenses.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('new expense page', () => {
  test('Save expense POSTs and lands back on /expenses with the new row', async ({ page }) => {
    const { accessToken } = await signup(page)
    const merchant = `Vendor-${Date.now()}`
    await page.goto(APP_BASE + '/expenses/new')
    await page.getByLabel(/merchant/i).fill(merchant)
    await page.getByLabel(/category/i).selectOption('Travel')
    await page.getByLabel(/^amount$/i).fill('123.45')
    await page.getByLabel(/^tax \(optional\)$/i).fill('10.50')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save expense/i }).click()
      await page.waitForURL('**/expenses', { timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/expenses(\?|$)/.test(r.url))
    expect(post?.status, 'POST /api/expenses').toBe(201)
    await expect(page.getByText(merchant)).toBeVisible({ timeout: 10000 })
    // Read-after-write
    const list = await page.request.get(`${API_BASE}/expenses`, {
      headers: apiHeaders(accessToken),
    })
    const arr = (await list.json()) as Array<{
      merchant: string
      amount_cents: number
      category: string
    }>
    const found = arr.find((e) => e.merchant === merchant)
    expect(found, 'expense persisted in DB').toBeTruthy()
    expect(found?.amount_cents).toBe(12345)
    expect(found?.category).toBe('Travel')
  })

  test('Tax deductible checkbox toggles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    const cb = page.getByLabel(/tax deductible/i)
    expect(await cb.isChecked()).toBe(true)
    await cb.uncheck()
    expect(await cb.isChecked()).toBe(false)
  })

  test('Notes textarea accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.getByLabel(/notes/i).fill('Reimbursable client expense')
    await expect(page.getByLabel(/notes/i)).toHaveValue('Reimbursable client expense')
  })

  test('Back link returns to /expenses', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.getByRole('link', { name: /^← Expenses$/i }).click()
    await page.waitForURL('**/expenses', { timeout: 5000 })
  })

  test('Cancel link returns to /expenses', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.getByRole('link', { name: /^cancel$/i }).click()
    await page.waitForURL('**/expenses', { timeout: 5000 })
  })

  test('Category select offers all 8 options', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    const opts = await page
      .getByLabel(/category/i)
      .locator('option')
      .allInnerTexts()
    expect(opts.length).toBeGreaterThanOrEqual(8)
    expect(opts).toContain('Travel')
    expect(opts).toContain('Meals')
  })
})
