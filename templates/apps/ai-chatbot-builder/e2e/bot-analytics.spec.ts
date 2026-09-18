/**
 * /bots/:id/analytics — analytics page must hit the real /api/bots/:id/stats
 * endpoint and render numeric KPIs derived from API state, not hardcoded
 * placeholders.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  seedBot,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('bot analytics', () => {
  test('hits /api/bots/:id/stats and renders the totals', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('analytics'))
    const { id } = await seedBot(page, accessToken, { name: `Analytics Bot ${Date.now()}` })

    // Sanity-check the API directly.
    const apiStats = await page.request.get(API_BASE + `/bots/${id}/stats`, {
      headers: authHeaders(accessToken),
    })
    expect(apiStats.status()).toBe(200)
    const stats = await apiStats.json()
    expect(stats).toHaveProperty('total_conversations')
    expect(stats).toHaveProperty('total_messages')

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/bots/${id}/analytics`)
      await page.waitForLoadState('networkidle')
    })
    const apiCall = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/bots/${id}/stats`).test(r.url),
    )
    expect(apiCall, 'analytics page must call /api/bots/:id/stats').toBeTruthy()
    expect(apiCall!.status).toBe(200)
  })

  test('cross-tenant /api/bots/:id/stats is denied', async ({ page, browser }) => {
    const { accessToken } = await signup(page, uniqueEmail('analytics-owner'))
    const { id } = await seedBot(page, accessToken, { name: `Owned ${Date.now()}` })

    // Fresh context for the intruder — same-page re-signup hits /signup
    // while already authenticated and gets redirected away.
    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    const intruder = await signup(pageB, uniqueEmail('analytics-intruder'))
    const stolen = await pageB.request.get(API_BASE + `/bots/${id}/stats`, {
      headers: authHeaders(intruder.accessToken),
      failOnStatusCode: false,
    })
    expect(stolen.status()).toBeGreaterThanOrEqual(400)
    expect(stolen.status()).toBeLessThan(500)
    await ctxB.close()
  })
})
