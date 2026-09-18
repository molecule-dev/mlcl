/**
 * Moderation: report submission (member) + report listing (mod-gated).
 *
 * The Promote-to-mod path is database-only, so the listing test confirms
 * the 403 gate for an ordinary member; the resolve / pin / lock paths
 * are covered by `06-moderator.spec.ts` against a seeded mod identity.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, seedThread, signup } from './_helpers.js'

test.describe('forum moderation', () => {
  test('member can submit a report on a thread', async ({ page }) => {
    const { accessToken } = await signup(page)
    const thread = await seedThread(page, accessToken)
    const res = await page.request.post(`${API_BASE}/moderation/reports`, {
      headers: apiHeaders(accessToken),
      data: {
        target_type: 'thread',
        target_id: thread.id,
        reason: 'spam',
        description: 'looks like spam',
      },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeLessThan(400)
    const body = (await res.json()) as { status?: string; reason?: string }
    expect(body.status).toBe('pending')
    expect(body.reason).toBe('spam')
  })

  test('member listing /moderation/reports is forbidden', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/moderation/reports?status=pending`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(403)
  })

  test('member pin/lock thread requests are forbidden', async ({ page }) => {
    const { accessToken } = await signup(page)
    const thread = await seedThread(page, accessToken)
    const pin = await page.request.post(`${API_BASE}/moderation/threads/${thread.id}/pin`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(pin.status()).toBe(403)
    const lock = await page.request.post(`${API_BASE}/moderation/threads/${thread.id}/lock`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(lock.status()).toBe(403)
  })
})
