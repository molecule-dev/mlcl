import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  listTransactions,
  seedTransaction,
  signup,
} from './_helpers.js'

test.describe('/transactions', () => {
  test('empty state renders for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/transactions')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('body')).toContainText(/No transactions yet/i)
  })

  test('Record-transaction modal POSTs and the row appears in the table', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/transactions')
    await page
      .getByRole('button', { name: /Record transaction/i })
      .first()
      .click()
    await page.waitForTimeout(300)
    await page
      .locator('label')
      .filter({ hasText: /^Symbol$/ })
      .locator('input')
      .first()
      .fill('MSFT')
    await page
      .locator('label')
      .filter({ hasText: /^Shares$/ })
      .locator('input')
      .first()
      .fill('5')
    await page
      .locator('label')
      .filter({ hasText: /Price per share/i })
      .locator('input')
      .first()
      .fill('442')

    const calls = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Save transaction$/ })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const post = calls.find((c) => c.method === 'POST' && /\/api\/transactions(?:\?|$)/.test(c.url))
    expect(post, 'POST /api/transactions not seen').toBeTruthy()
    expect(post?.status).toBeLessThan(400)

    const txs = await listTransactions(page, accessToken)
    expect(txs.find((t) => t.symbol === 'MSFT' && t.kind === 'buy')).toBeTruthy()

    await page.reload()
    await expect(page.locator('body')).toContainText(/MSFT/)
  })

  test('Export CSV downloads a non-empty CSV with a header row', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedTransaction(page, accessToken, { symbol: 'NVDA', shares: 1 })
    await page.goto(APP_BASE + '/transactions')
    await page.waitForLoadState('networkidle').catch(() => {})

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10_000 }),
      page
        .getByRole('button', { name: /Export CSV/i })
        .first()
        .click(),
    ])
    const path = await download.path()
    const fs = await import('node:fs')
    const stats = fs.statSync(path)
    expect(stats.size).toBeGreaterThan(20)
    const text = fs.readFileSync(path, 'utf-8')
    expect(text.split('\n')[0]).toMatch(/symbol|kind/i)
  })

  test('GET /api/transactions/export returns 200 and a CSV body', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedTransaction(page, accessToken, { symbol: 'AAPL', shares: 2 })
    const r = await page.request.get(`${API_BASE}/transactions/export`, {
      headers: authHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
    const body = await r.text()
    expect(body.split('\n')[0]).toMatch(/symbol|kind/i)
  })
})
