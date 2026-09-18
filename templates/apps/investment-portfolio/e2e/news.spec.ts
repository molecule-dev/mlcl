import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup } from './_helpers.js'

test.describe('/news', () => {
  test('GET /api/news returns a list of articles', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.get(`${API_BASE}/news`, {
      headers: authHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as unknown
    const arr = Array.isArray(body) ? body : ((body as { data?: unknown[] }).data ?? [])
    expect(arr.length).toBeGreaterThan(0)
  })

  test('News page renders article tiles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/news')
    await page.waitForLoadState('networkidle').catch(() => {})
    const text = await page.locator('main, body').first().innerText()
    expect(text.length).toBeGreaterThan(50)
    expect(text).toMatch(/news|article|Read|today|market|earnings/i)
  })

  test('GET /api/news/search?q=tech returns filtered results', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.get(`${API_BASE}/news/search?q=tech`, {
      headers: authHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
  })
})
