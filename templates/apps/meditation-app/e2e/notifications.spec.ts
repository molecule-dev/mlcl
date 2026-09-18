/**
 * /notifications — inbox. Asserts list render, mark-all-read PATCH, and
 * per-row dismiss DELETE actually persist server-side.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedNotification,
  signup,
} from './_helpers.js'

test.describe('notifications (/notifications)', () => {
  test('renders the empty-state for a fresh account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByTestId('notifications-empty')).toBeVisible({ timeout: 10000 })
  })

  test('seeded notifications render with title text', async ({ page }) => {
    const { accessToken } = await signup(page)
    const a = await seedNotification(page, accessToken, `Spec alert ${Date.now()}`)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(a.title)).toBeVisible({ timeout: 10000 })
  })

  test('"Mark all read" PATCHes every unread row server-side', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedNotification(page, accessToken)
    await seedNotification(page, accessToken)
    await page.goto(APP_BASE + '/notifications')

    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('notifications-mark-all').click()
      await page.waitForTimeout(800)
    })
    const patches = reqs.filter(
      (r) => r.method === 'PATCH' && r.url.includes('/api/notifications/') && r.status < 400,
    )
    expect(
      patches.length,
      JSON.stringify(reqs.map((r) => `${r.method} ${r.url} ${r.status}`)),
    ).toBeGreaterThan(0)

    const r = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    const rows = (await r.json()) as Array<{ read_at: string | null }>
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.read_at !== null)).toBe(true)
  })

  test('dismissing a row DELETEs it server-side', async ({ page }) => {
    const { accessToken } = await signup(page)
    const target = await seedNotification(page, accessToken)
    await page.goto(APP_BASE + '/notifications')
    await page.getByTestId(`notification-dismiss-${target.id}`).click()
    await page.waitForTimeout(500)

    const r = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    const rows = (await r.json()) as Array<{ id: string }>
    expect(rows.some((row) => row.id === target.id)).toBe(false)
  })
})
