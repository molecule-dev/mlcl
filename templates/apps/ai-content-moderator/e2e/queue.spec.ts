/**
 * /queue — list, filter, bulk approve/reject. Asserts on real
 * outcomes: bulk-approve POSTs all selected ids and the items
 * actually flip to verdict=approved on next read.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedQueueItem, signup } from './_helpers.js'

test.describe('queue page', () => {
  test('renders KPIs and table on initial load', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/queue')
    await expect(page.locator('h1')).toContainText(/queue/i)
    await expect(page.locator('text=/Queued/i').first()).toBeVisible()
    await expect(page.locator('text=/In review/i').first()).toBeVisible()
    await expect(page.locator('text=/Escalated/i').first()).toBeVisible()
    await expect(page.locator('text=/Decided/i').first()).toBeVisible()
  })

  test('empty state row is shown when account has no items', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/queue')
    await expect(page.locator('text=/no items/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('seeded item shows in the table', async ({ page }) => {
    const { accessToken } = await signup(page)
    const { preview } = await seedQueueItem(page, accessToken, `Queue item ${Date.now()}`)
    await page.goto(APP_BASE + '/queue')
    await expect(page.locator(`text=${preview}`).first()).toBeVisible({ timeout: 10000 })
  })

  test('filter buttons set ?filter=… query param and toggle aria-pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/queue')
    await page.getByRole('button', { name: /^Pending$/i }).click()
    await expect(page).toHaveURL(/filter=pending/)
    await expect(page.getByRole('button', { name: /^Pending$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('bulk-approve persists: items flip from queued to decided/approve in the API', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const a = await seedQueueItem(page, accessToken, `Bulk A ${Date.now()}`)
    const b = await seedQueueItem(page, accessToken, `Bulk B ${Date.now()}`)
    await page.goto(APP_BASE + '/queue')
    await expect(page.locator(`text=${a.preview}`)).toBeVisible({ timeout: 10000 })

    // Select all visible items via the header checkbox.
    await page.getByRole('checkbox', { name: /select all/i }).click()
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^Approve$/i }).click()
      await expect(page.locator('text=/Approve/i').first()).toBeVisible()
      // Wait for both POSTs to settle.
      await page.waitForTimeout(800)
    })
    const approveCalls = reqs.filter(
      (r) => /\/api\/moderation\/.+\/approve/.test(r.url) && r.status === 200,
    )
    expect(approveCalls.length, JSON.stringify(reqs)).toBeGreaterThanOrEqual(2)

    // Read-after-write: GET both items via the API and assert decision = approve.
    for (const id of [a.id, b.id]) {
      const r = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/moderation/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(r.status(), await r.text()).toBe(200)
      const body = await r.json()
      expect(body.decision).toBe('approve')
    }
  })

  test('bulk-reject persists: items flip to decision=reject', async ({ page }) => {
    const { accessToken } = await signup(page)
    const a = await seedQueueItem(page, accessToken, `Reject A ${Date.now()}`)
    await page.goto(APP_BASE + '/queue')
    await expect(page.locator(`text=${a.preview}`)).toBeVisible({ timeout: 10000 })
    await page.getByRole('checkbox', { name: /select all/i }).click()
    await page.getByRole('button', { name: /^Reject$/i }).click()
    await page.waitForTimeout(600)
    const r = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/moderation/${a.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const body = await r.json()
    expect(body.decision).toBe('reject')
  })

  test('clicking a row navigates to /queue/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const item = await seedQueueItem(page, accessToken, `Open ${Date.now()}`)
    await page.goto(APP_BASE + '/queue')
    await page.locator(`text=${item.preview}`).first().click()
    await page.waitForURL(new RegExp(`/queue/${item.id}`), { timeout: 5000 })
  })
})
