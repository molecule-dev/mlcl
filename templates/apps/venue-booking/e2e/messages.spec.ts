/**
 * /messages — thread list + thread detail. We assert that creating a
 * thread via POST /api/messages returns an id and that GET on the
 * resulting thread succeeds.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, firstVenueId, signup } from './_helpers.js'

test('GET /api/messages fires on /messages', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/messages')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const get = reqs.find((r) => r.method === 'GET' && /\/api\/messages/.test(r.url))
  expect(get?.status).toBe(200)
})

test('POST /api/messages creates (or returns) a thread for a venue', async ({ page }) => {
  await signup(page)
  const venueId = await firstVenueId(page)
  const created = await apiRequest(page, 'POST', '/messages', { venue_id: venueId })
  expect([200, 201]).toContain(created.status)

  // The handler returns { thread, messages } — extract the thread id.
  const threadId =
    (created.body as { thread?: { id?: string }; data?: { id?: string }; id?: string }).thread
      ?.id ??
    (created.body as { data?: { id?: string } }).data?.id ??
    (created.body as { id?: string }).id
  expect(threadId).toBeTruthy()

  // The thread should be retrievable
  const got = await apiRequest(page, 'GET', '/messages/' + threadId)
  expect(got.status).toBe(200)
})
