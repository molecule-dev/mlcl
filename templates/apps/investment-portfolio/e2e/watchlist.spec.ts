import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  listWatchlist,
  signup,
} from './_helpers.js'

test.describe('/watchlist', () => {
  test('empty state renders for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/watchlist')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('body')).toContainText(/No tickers tracked yet/i)
  })

  test('Track ticker modal posts and item appears in list', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/watchlist')
    await page
      .getByRole('button', { name: /Track ticker/i })
      .first()
      .click()
    await page.waitForTimeout(300)
    await page
      .locator('label')
      .filter({ hasText: /^Symbol$/ })
      .locator('input')
      .first()
      .fill('NVDA')

    const calls = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Track$/ })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const post = calls.find((c) => c.method === 'POST' && /\/api\/watchlist(?:\?|$)/.test(c.url))
    expect(post, 'POST /api/watchlist not seen').toBeTruthy()
    expect(post?.status).toBeLessThan(400)

    const wl = await listWatchlist(page, accessToken)
    expect(wl.find((w) => w.symbol === 'NVDA')).toBeTruthy()
  })

  test('NVDA visible after page reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.request.post(`${API_BASE}/watchlist`, {
      headers: authHeaders(accessToken),
      data: { symbol: 'NVDA' },
    })
    await page.goto(APP_BASE + '/watchlist')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('body')).toContainText('NVDA')
    await page.reload()
    await expect(page.locator('body')).toContainText('NVDA')
  })

  test('Remove button removes the item via DELETE /api/watchlist/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.request.post(`${API_BASE}/watchlist`, {
      headers: authHeaders(accessToken),
      data: { symbol: 'NVDA' },
    })
    await page.goto(APP_BASE + '/watchlist')
    await page.waitForLoadState('networkidle').catch(() => {})

    // First click arms the shared ConfirmButton — the confirm label appears,
    // no DELETE fires yet.
    await page
      .getByRole('button', { name: /^Remove$/ })
      .first()
      .click()
    const confirm = page.getByRole('button', { name: /Remove NVDA from watchlist\?/ })
    await expect(confirm).toBeVisible()

    // Second click commits.
    const calls = await captureNetwork(page, async () => {
      await confirm.click()
      await page.waitForTimeout(1200)
    })
    const del = calls.find((c) => c.method === 'DELETE' && /\/api\/watchlist\//.test(c.url))
    expect(del).toBeTruthy()
    expect(del?.status).toBeLessThan(400)

    const wl = await listWatchlist(page, accessToken)
    expect(wl.find((w) => w.symbol === 'NVDA')).toBeFalsy()
  })
})
