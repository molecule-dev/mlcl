/**
 * /search — universal search. Asserts suggestion chips, debounced query
 * fires /api/sessions?q=… and renders results, suggestion chips run a query.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('search (/search)', () => {
  test('shows category suggestion chips before any query is typed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await expect(page.getByTestId('search-suggestions')).toBeVisible({ timeout: 10000 })
  })

  test('typing a session title surfaces that session via /api/sessions?q=', async ({ page }) => {
    await signup(page)
    // Read the session under test out of the catalog rather than naming a
    // seeded title — the demo catalog is replaced first in a real app.
    const listed = await page.request.get(`${API_BASE}/sessions?limit=1`)
    expect(listed.status()).toBe(200)
    const sessions = (await listed.json()) as Array<{ title: string }>
    expect(sessions.length, 'sessions catalog should be populated').toBeGreaterThan(0)
    const session = sessions[0]!
    const term = session.title.split(/\s+/)[0]!

    await page.goto(APP_BASE + '/search')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('search-input').fill(term)
      await expect(page.getByTestId('search-sessions')).toBeVisible({ timeout: 10000 })
    })
    const queryCalls = reqs.filter(
      (r) =>
        r.method === 'GET' &&
        r.url.includes('/api/sessions?') &&
        r.url.includes('q=' + encodeURIComponent(term)) &&
        r.status < 400,
    )
    expect(queryCalls.length, JSON.stringify(reqs.map((r) => r.url))).toBeGreaterThan(0)
    await expect(page.getByTestId('search-sessions').getByText(session.title).first()).toBeVisible()
  })

  test('clicking a category suggestion chip runs a search', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await page.getByTestId('search-suggestion-sleep').click()
    await expect(page.getByTestId('search-sessions')).toBeVisible({ timeout: 10000 })
  })
})
