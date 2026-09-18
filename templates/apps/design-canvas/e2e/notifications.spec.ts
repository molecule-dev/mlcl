/**
 * /notifications — Auth-only inbox. Loads /api/notifications, lets the
 * user filter by kind/unread and mark all as read via
 * PATCH /api/notifications/read-all.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('notifications page', () => {
  test('loads inbox — GET /api/notifications hit', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await expect(page.locator('[data-mol-id="notifications-list"]')).toBeVisible({
        timeout: 10000,
      })
    })
    const get = reqs.find(
      (r) => /\/api\/notifications(\?|$)/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    expect(get).toBeTruthy()
  })

  test('"Mark all as read" PATCHes /api/notifications/read-all', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.request.post(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
      data: { kind: 'comment', actor_name: 'QA', sentence: 'left a comment', preview: 'noted' },
    })
    await page.goto(APP_BASE + '/notifications')
    await page.waitForSelector('[data-mol-id="notifications-list"]', { timeout: 10000 })
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="notifications-mark-all-read"]').click()
      await page.waitForTimeout(1000)
    })
    const patch = reqs.find(
      (r) => /\/api\/notifications\/read-all/.test(r.url) && r.method === 'PATCH',
    )
    expect(patch).toBeTruthy()
  })

  test('"All" filter is selectable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.locator('[data-mol-id="notifications-filter-all"]').click()
    await expect(page.locator('[data-mol-id="notifications-filter-all"]')).toBeVisible()
  })

  test('"Unread" filter is selectable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.locator('[data-mol-id="notifications-filter-unread"]').click()
    await expect(page.locator('[data-mol-id="notifications-filter-unread"]')).toBeVisible()
  })

  test('"Mentions" filter is selectable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.locator('[data-mol-id="notifications-filter-mentions"]').click()
    await expect(page.locator('[data-mol-id="notifications-filter-mentions"]')).toBeVisible()
  })

  test('"Comments" filter is selectable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.locator('[data-mol-id="notifications-filter-comments"]').click()
    await expect(page.locator('[data-mol-id="notifications-filter-comments"]')).toBeVisible()
  })

  test('"Invites" filter is selectable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.locator('[data-mol-id="notifications-filter-invites"]').click()
    await expect(page.locator('[data-mol-id="notifications-filter-invites"]')).toBeVisible()
  })

  test('the list renders (empty-state OR notifications)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-mol-id="notifications-list"]')).toBeVisible()
  })

  test('seeded notification appears in the list after reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    const preview = `Spec preview ${Date.now()}`
    await page.request.post(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
      data: { kind: 'mention', actor_name: 'QA', sentence: 'mentioned you', preview },
    })
    await page.goto(APP_BASE + '/notifications')
    await page.waitForSelector('[data-mol-id="notifications-list"]', { timeout: 10000 })
    await expect(page.locator(`text=${preview}`).first()).toBeVisible({ timeout: 10000 })
  })
})
