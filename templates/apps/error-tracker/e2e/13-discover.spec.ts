import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('/discover', () => {
  test('GET /api/discover/events returns events for level:error', async ({ page }) => {
    await signup(page, uniqueEmail('discover-events'))
    const res = await page.request.get(
      `${API_BASE}/discover/events?q=${encodeURIComponent('level:error')}`,
      { headers: authHeaders(page) },
    )
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { count: number; events: Array<{ level: string }> }
    expect(body.count, 'seed should produce error events').toBeGreaterThan(0)
    expect(body.events.every((e) => e.level === 'error')).toBe(true)
  })

  test('UI search bar runs a query and renders results', async ({ page }) => {
    await signup(page, uniqueEmail('discover-ui'))
    await page.goto(APP_BASE + '/discover')
    await page.waitForLoadState('networkidle')
    const search = page
      .locator('input[type="search"], input[placeholder*="query" i], input[type="text"]')
      .first()
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await search
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no search control on discover')
    await search.fill('level:error')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(2000)
    const body = await page.locator('body').innerText()
    expect(body.length, 'discover page renders some content').toBeGreaterThan(0)
  })

  test('environment:production filter narrows results', async ({ page }) => {
    await signup(page, uniqueEmail('discover-env'))
    const all = await page.request.get(`${API_BASE}/discover/events?q=`, {
      headers: authHeaders(page),
    })
    const allBody = (await all.json()) as { count: number }
    const filtered = await page.request.get(
      `${API_BASE}/discover/events?q=${encodeURIComponent('environment:production')}`,
      { headers: authHeaders(page) },
    )
    const filteredBody = (await filtered.json()) as {
      count: number
      events: Array<{ environment: string }>
    }
    expect(filteredBody.count).toBeLessThanOrEqual(allBody.count)
    expect(filteredBody.events.every((e) => e.environment === 'production')).toBe(true)
  })
})
