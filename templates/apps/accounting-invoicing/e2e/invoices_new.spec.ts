/**
 * /invoices/new — line-item editor, totals, POST /api/invoices, navigates
 * back to /invoices on success.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('new invoice page', () => {
  test('Send invoice POSTs and the new invoice appears in the list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const customer = `Globex ${Date.now()}`
    await page.goto(APP_BASE + '/invoices/new')
    await page.getByRole('textbox', { name: /^customer$/i }).fill(customer)
    await page.getByPlaceholder(/description/i).fill('Lab work')
    await page.getByRole('spinbutton').nth(1).fill('5')
    await page.getByRole('spinbutton').nth(2).fill('200')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /send invoice/i }).click()
      await page.waitForURL('**/invoices', { timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/invoices(\?|$)/.test(r.url))
    expect(post?.status, 'POST /api/invoices').toBe(201)
    await expect(page.getByText(customer)).toBeVisible({ timeout: 10000 })
    // Read-after-write via API: the user sees the invoice they just created
    const list = await page.request.get(`${API_BASE}/invoices`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await list.json()) as Array<{ customer_name: string; subtotal_cents: number }>
    const found = body.find((b) => b.customer_name === customer)
    expect(found, 'invoice persisted in DB').toBeTruthy()
    expect(found?.subtotal_cents).toBe(100000)
  })

  test('"+ Add line" appends a new line-item row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices/new')
    const before = await page.locator('input[placeholder="Description"]').count()
    await page.getByRole('button', { name: /add line/i }).click()
    const after = await page.locator('input[placeholder="Description"]').count()
    expect(after).toBe(before + 1)
  })

  test('× removes a line-item row (when more than one exists)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices/new')
    await page.getByRole('button', { name: /add line/i }).click()
    const before = await page.locator('input[placeholder="Description"]').count()
    await page.getByRole('button', { name: '×' }).first().click()
    const after = await page.locator('input[placeholder="Description"]').count()
    expect(after).toBe(before - 1)
  })

  test('totals update as quantity × unit price changes', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices/new')
    await page.getByRole('spinbutton').nth(1).fill('3')
    await page.getByRole('spinbutton').nth(2).fill('25')
    const text = await page.locator('form').textContent()
    expect(text).toMatch(/75\.00/)
  })

  test('Back link returns to /invoices', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices/new')
    await page.getByRole('link', { name: /^← Invoices$/i }).click()
    await page.waitForURL('**/invoices', { timeout: 5000 })
  })

  test('Save as draft POSTs a draft invoice and returns to /invoices', async ({ page }) => {
    const { accessToken } = await signup(page)
    const customer = `Draftco ${Date.now()}`
    await page.goto(APP_BASE + '/invoices/new')
    await page.getByRole('textbox', { name: /^customer$/i }).fill(customer)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save as draft/i }).click()
      await page.waitForURL('**/invoices', { timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/invoices(\?|$)/.test(r.url))
    expect(post?.status, 'POST /api/invoices').toBe(201)
    // Read-after-write via API: the draft was persisted with status "draft".
    const list = await page.request.get(`${API_BASE}/invoices`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await list.json()) as Array<{ customer_name: string; status: string }>
    const found = body.find((b) => b.customer_name === customer)
    expect(found?.status, 'draft persisted in DB').toBe('draft')
  })

  test('Notes textarea accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices/new')
    await page.getByRole('textbox', { name: /notes/i }).fill('Pay by EOM please')
    await expect(page.getByRole('textbox', { name: /notes/i })).toHaveValue('Pay by EOM please')
  })

  test('Cancel link returns to /invoices', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices/new')
    await page.getByRole('link', { name: /^cancel$/i }).click()
    await page.waitForURL('**/invoices', { timeout: 5000 })
  })
})
