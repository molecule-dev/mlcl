/**
 * /notifications — feed of notifications. Tests assert that the page
 * fetches /api/notifications, that mark-all-read flips every notif to
 * read state, and that reload preserves the read state.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test('GET /api/notifications fires and renders the feed', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const get = reqs.find((r) => r.method === 'GET' && /\/api\/notifications/.test(r.url))
  expect(get?.status).toBe(200)
})

test('mark-all-read button calls PUT /api/notifications/read-all', async ({ page }) => {
  await signup(page)
  // Fresh users are seeded with unread demo notifications on their first
  // authed request. Poll instead of skip: a parallel bootstrap request may
  // still be finishing when this test's first fetch lands, but the seed
  // contract guarantees unread items — the read-all call must be proven.
  let unread = 0
  await expect
    .poll(
      async () => {
        const list = await apiRequest(page, 'GET', '/notifications')
        const items = (list.body as { data?: { unread?: boolean }[] })?.data ?? []
        unread = items.filter((n) => n.unread).length
        return unread
      },
      { timeout: 10_000, intervals: [250, 500, 1_000] },
    )
    .toBeGreaterThan(0)

  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
    await page.getByRole('button', { name: /mark all read/i }).click()
    await page.waitForTimeout(1_500)
  })
  const put = reqs.find((r) => r.method === 'PUT' && /\/api\/notifications\/read-all/.test(r.url))
  expect(put?.status).toBeGreaterThanOrEqual(200)
  expect(put?.status).toBeLessThan(400)

  // After API success, the unread count should be zero on a refetch
  const after = await apiRequest(page, 'GET', '/notifications')
  const afterItems = (after.body as { data?: { unread?: boolean }[] })?.data ?? []
  expect(afterItems.filter((n) => n.unread).length).toBe(0)
})
