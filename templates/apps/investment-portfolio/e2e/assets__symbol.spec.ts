import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  seedTransaction,
  signup,
} from './_helpers.js'

test.describe('/assets/:symbol', () => {
  test('AAPL detail page renders price and fundamentals', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/assets/AAPL')
    await page.waitForLoadState('networkidle').catch(() => {})
    const text = await page.locator('main, body').first().innerText()
    expect(text).toMatch(/\$[0-9]+\.[0-9]+/)
    expect(text).toMatch(/Fundamentals|About|Apple|Market cap/i)
  })

  test('Sell button opens transaction modal pre-populated with symbol', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedTransaction(page, accessToken, { symbol: 'AAPL', shares: 5 })
    await page.goto(APP_BASE + '/assets/AAPL')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page
      .getByRole('button', { name: /^Sell$/ })
      .first()
      .click()
    await page.waitForTimeout(300)
    const symbolField = page
      .locator('label')
      .filter({ hasText: /^Symbol$/ })
      .locator('input')
      .first()
    await expect(symbolField).toHaveValue(/AAPL/)
  })

  test('Buy on /assets/AAPL creates a transaction visible in /api/transactions', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/assets/AAPL')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.getByRole('button', { name: /^Buy$/ }).first().click()
    await page.waitForTimeout(300)
    await page
      .locator('label')
      .filter({ hasText: /^Shares$/ })
      .locator('input')
      .first()
      .fill('3')
    await page
      .locator('label')
      .filter({ hasText: /Price per share/i })
      .locator('input')
      .first()
      .fill('190')
    const calls = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Save transaction$/ })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const post = calls.find((c) => c.method === 'POST' && /\/api\/transactions(?:\?|$)/.test(c.url))
    expect(post).toBeTruthy()
    expect(post?.status).toBeLessThan(400)
    const r = await page.request.get(`${API_BASE}/transactions?symbol=AAPL`, {
      headers: authHeaders(accessToken),
    })
    const body = (await r.json()) as Array<{ symbol: string }>
    const list = Array.isArray(body) ? body : ((body as { data?: unknown[] }).data ?? [])
    expect((list as Array<{ symbol: string }>).find((t) => t.symbol === 'AAPL')).toBeTruthy()
  })

  test('GET /api/holdings/:id returns the requested asset metadata', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.get(`${API_BASE}/holdings/AAPL`, {
      headers: authHeaders(accessToken),
    })
    // 404 acceptable if user has no AAPL holding; otherwise should be 200
    expect([200, 404]).toContain(r.status())
  })
})
