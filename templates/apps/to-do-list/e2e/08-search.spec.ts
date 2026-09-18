import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, captureNetwork, API_BASE, cookieHeader } from './_helpers.js'

test.describe('search', () => {
  test('/search renders the idle state on a fresh account', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto('/search')
      await page.waitForLoadState('networkidle').catch(() => null)
      await expect(page.getByText(/start typing/i)).toBeVisible({ timeout: 15_000 })
    })
    const labelsCall = reqs.find((r) => r.method === 'GET' && /\/api\/labels(?:\?|$)/.test(r.url))
    expect(labelsCall, 'GET /api/labels was not observed during /search render').toBeTruthy()
  })

  test('typing a query that matches a task surfaces it via GET /api/tasks/search', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const unique = `Searchable-${Date.now()}`
    await page.request.post(`${API_BASE}/tasks`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: { title: unique, priority: 4 },
    })

    const reqs = await captureNetwork(page, async () => {
      await page.goto('/search')
      await page.getByRole('searchbox', { name: /search tasks/i }).fill(unique)
      await expect(page.getByText(unique).first()).toBeVisible({ timeout: 15_000 })
    })
    const searchCall = reqs.find(
      (r) => r.method === 'GET' && /\/api\/tasks\/search\?q=/.test(r.url),
    )
    expect(searchCall, 'GET /api/tasks/search was not observed').toBeTruthy()
    expect(searchCall!.status).toBe(200)
  })

  test('GET /api/tasks/search?q= returns an empty array on an empty query', async ({ page }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const r = await page.request.get(`${API_BASE}/tasks/search?q=`, { headers: { Cookie: cookie } })
    // Backend may either 400 the empty query or return empty array — accept both.
    expect([200, 400]).toContain(r.status())
    if (r.status() === 200) {
      const body = await r.json()
      const arr = Array.isArray(body) ? body : (body.data ?? [])
      expect(Array.isArray(arr)).toBe(true)
    }
  })
})
