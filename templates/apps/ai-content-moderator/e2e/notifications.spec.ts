/**
 * /notifications — feed + read-state CRUD. Asserts read-after-write
 * for both single mark-read and bulk mark-all-read.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedNotification, signup } from './_helpers.js'

test.describe('notifications page', () => {
  test('renders empty-state for a fresh account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('h1')).toContainText(/notifications/i)
    await expect(page.locator('text=/No notifications/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('seeded notifications render with title + body', async ({ page }) => {
    const { accessToken } = await signup(page)
    const a = await seedNotification(page, accessToken, `Alert A ${Date.now()}`)
    await seedNotification(page, accessToken, `Alert B ${Date.now()}`)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator(`text=${a.title}`).first()).toBeVisible({ timeout: 10000 })
    // Unread badge should appear
    await expect(page.locator('text=/new/i').first()).toBeVisible()
  })

  test('Mark all read flips read_at on every row (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedNotification(page, accessToken, `Mark all A ${Date.now()}`)
    await seedNotification(page, accessToken, `Mark all B ${Date.now()}`)
    await page.goto(APP_BASE + '/notifications')

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /mark all read/i }).click()
      await page.waitForTimeout(800)
    })
    const post = reqs.find(
      (r) => /\/api\/notifications\/read-all/.test(r.url) && r.method === 'POST',
    )
    expect(post?.status).toBe(200)

    // Read-after-write
    const list = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/notifications`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const rows: Array<{ read_at: string | null }> = await list.json()
    expect(rows.length).toBeGreaterThan(0)
    expect(
      rows.every((r) => r.read_at),
      JSON.stringify(rows),
    ).toBe(true)
  })

  test('filter buttons toggle ?filter=… query param', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.getByRole('button', { name: /assignments/i }).click()
    await expect(page).toHaveURL(/filter=assignment/)
  })

  test('mark single notification as read flips its row only', async ({ page }) => {
    const { accessToken } = await signup(page)
    const target = await seedNotification(page, accessToken, `Mark one ${Date.now()}`)
    await seedNotification(page, accessToken, `Other ${Date.now()}`)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator(`text=${target.title}`).first()).toBeVisible({ timeout: 10000 })

    // Click the mark-read button on the row containing this title.
    const row = page.locator('li', { hasText: target.title }).first()
    await row.getByRole('button', { name: /mark as read/i }).click()
    await page.waitForTimeout(500)

    const r = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/notifications`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const rows: Array<{ id: string; read_at: string | null }> = await r.json()
    const targetRow = rows.find((x) => x.id === target.id)
    expect(targetRow?.read_at, 'target row should be marked read').not.toBeNull()
    // The other row should still be unread.
    const others = rows.filter((x) => x.id !== target.id && x.read_at === null)
    expect(others.length).toBeGreaterThan(0)
  })
})
