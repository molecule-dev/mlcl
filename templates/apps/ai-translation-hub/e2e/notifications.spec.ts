import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('/notifications: feed + mark all read', () => {
  test('clicking Mark all read updates read_at on the backend', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Seed two notifications.
    const ids: string[] = []
    for (const i of [1, 2]) {
      const res = await page.request.post(`${API_BASE}/notifications`, {
        headers: apiHeaders(accessToken),
        data: { kind: 'commented', title: `User ${i}`, body: `Mention #${i}` },
        failOnStatusCode: true,
      })
      const body = (await res.json()) as { id: string }
      ids.push(body.id)
    }

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      const button = page.locator('button[data-mol-id="notifications-mark-all-read"]').first()
      await expect(button).toBeVisible({ timeout: 10_000 })
      await button.click()
      await page.waitForTimeout(500)
    })
    expect(reqs.find((r) => /\/api\/notifications/.test(r.url) && r.method === 'GET')).toBeDefined()

    await expect
      .poll(
        async () => {
          const r = await page.request.get(`${API_BASE}/notifications`, {
            headers: apiHeaders(accessToken),
            failOnStatusCode: false,
          })
          const list = (await r.json()) as Array<Record<string, unknown>>
          const seeded = list.filter((n) => ids.includes(String(n.id)))
          return seeded.length > 0 && seeded.every((n) => n.read_at != null)
        },
        { timeout: 10_000 },
      )
      .toBe(true)
  })

  test('GET /api/notifications returns the seeded list', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.request.post(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
      data: { kind: 'commented', title: 'Snapshot', body: 'List me' },
    })
    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    const list = (await res.json()) as Array<Record<string, unknown>>
    expect(list.find((n) => n.title === 'Snapshot')).toBeTruthy()
  })

  test('Notifications heading is visible after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i }).first()).toBeVisible()
  })
})
