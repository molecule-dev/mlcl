import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, captureNetwork, API_BASE, cookieHeader } from './_helpers.js'

test.describe('notifications', () => {
  test('/notifications renders the empty state on a fresh account', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto('/notifications')
      await page.waitForLoadState('networkidle').catch(() => null)
      await expect(page.getByText(/inbox zero/i)).toBeVisible({ timeout: 15_000 })
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/notifications(?:\?|$)/.test(r.url))
    expect(list, 'GET /api/notifications was not observed').toBeTruthy()
    expect(list!.status).toBe(200)
  })

  test('GET /api/notifications/unread-count returns { count: 0 } for a fresh account', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const r = await page.request.get(`${API_BASE}/notifications/unread-count`, {
      headers: { Cookie: cookie },
    })
    expect(r.status()).toBe(200)
    const body = await r.json()
    expect(body.count).toBe(0)
  })

  test('POST /api/notifications/mark-all-read is a no-op 200 on an empty account', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const r = await page.request.post(`${API_BASE}/notifications/mark-all-read`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: {},
    })
    expect(r.status()).toBe(200)
    const body = await r.json()
    expect(body.marked).toBe(true)
  })

  test('POST /api/notifications/:id/read returns 404 for unknown ids (IDOR-safe)', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const r = await page.request.post(
      `${API_BASE}/notifications/00000000-0000-0000-0000-000000000000/read`,
      {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: {},
      },
    )
    expect(r.status()).toBe(404)
  })
})
