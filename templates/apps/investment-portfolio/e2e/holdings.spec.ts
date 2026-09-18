import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authHeaders,
  captureNetwork,
  listHoldings,
  listTransactions,
  signup,
} from './_helpers.js'

test.describe('/holdings', () => {
  test('empty state renders for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/holdings')
    await page.waitForLoadState('networkidle').catch(() => {})
    const text = await page.locator('main, body').first().innerText()
    expect(text).toMatch(/holdings/i)
    expect(text).toMatch(/No holdings yet/i)
  })

  test('Buy button opens modal and POSTs /api/transactions', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/holdings')
    await page.getByRole('button', { name: /^Buy$/ }).first().click()
    await page.waitForTimeout(300)
    await page
      .locator('label')
      .filter({ hasText: /^Symbol$/ })
      .locator('input')
      .first()
      .fill('AAPL')
    await page
      .locator('label')
      .filter({ hasText: /^Shares$/ })
      .locator('input')
      .first()
      .fill('10')
    await page
      .locator('label')
      .filter({ hasText: /Price per share/i })
      .locator('input')
      .first()
      .fill('200')

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

    // Read-after-write — holdings include AAPL, transactions include the buy.
    const holdings = await listHoldings(page, accessToken)
    expect(holdings.find((h) => h.symbol === 'AAPL')).toBeTruthy()
    const txs = await listTransactions(page, accessToken)
    expect(txs.find((t) => t.symbol === 'AAPL' && t.kind === 'buy')).toBeTruthy()
  })

  test('AAPL row survives a hard reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.request.post(
      `${process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'}/transactions`,
      {
        headers: authHeaders(accessToken),
        data: { symbol: 'AAPL', kind: 'buy', shares: 10, price_per_share: 200 },
      },
    )
    await page.goto(APP_BASE + '/holdings')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('body')).toContainText(/AAPL/)
  })

  test('Symbol cell links to /assets/AAPL detail page', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.request.post(
      `${process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'}/transactions`,
      {
        headers: authHeaders(accessToken),
        data: { symbol: 'AAPL', kind: 'buy', shares: 10, price_per_share: 200 },
      },
    )
    await page.goto(APP_BASE + '/holdings')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.locator('a[href="/assets/AAPL"]').first().click()
    await expect(page).toHaveURL(/\/assets\/AAPL/)
  })
})
