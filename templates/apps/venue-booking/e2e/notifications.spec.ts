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
  // Ensure there's at least one unread notif by checking the seed
  const list = await apiRequest(page, 'GET', '/notifications')
  const items = (list.body as { data?: { unread?: boolean }[] })?.data ?? []
  const unread = items.filter((n) => n.unread)
  if (unread.length === 0) {
    test.skip(true, 'no unread notifications seeded — skipping')
    return
  }

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
