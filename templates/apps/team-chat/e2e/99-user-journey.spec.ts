/**
 * Cross-page kitchen-sink journey: a brand-new user signs up, sees the
 * dashboard, creates a channel, posts a message, opens a thread, posts
 * a reply, then signs out — all in one continuous flow against the real
 * app + real API.
 *
 * The test is intentionally chatty: it exists to catch regressions in
 * any of the per-page seams (auth, channel-create, message-post,
 * thread-reply, logout) that look fine in isolation but blow up when
 * chained together on a real session.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiSignupProAndPrime,
  authHeaders,
  getAccessToken,
  uniqueEmail,
} from './_helpers.js'

test('signed-in user creates a channel, posts a message, and replies in a thread', async ({
  page,
}) => {
  // 1) sign up — promote to Pro so the thread reply step exercises the
  //    paid feature without the entitlement gate blocking it.
  const { accessToken, name } = await apiSignupProAndPrime(
    page,
    uniqueEmail('journey'),
    'TestPass123!',
    'Journey Tester',
  )
  expect(accessToken).toBeTruthy()

  // 2) dashboard renders the user's first name
  await page.goto(APP_BASE + '/')
  await expect(page.locator('body')).toContainText(name.split(' ')[0])

  // 3) create a channel via API (the UI quick-action redirects to /channels/general)
  const ch = await page.request.post(`${API_BASE}/channels`, {
    headers: authHeaders(accessToken),
    data: { name: `journey-${Date.now()}`, description: 'kitchen-sink' },
  })
  expect(ch.status()).toBe(201)
  const channel = (await ch.json()) as { id: string; name: string }

  // 4) navigate to the new channel and send a message
  await page.goto(APP_BASE + `/channels/${channel.id}`)
  await page.locator('[data-mol-id="input-message"]').fill('journey message body')
  await page.locator('[data-mol-id="button-send"]').click()
  // Was: waitForTimeout(800) followed by a SINGLE read. Sending is a network
  // round-trip, so whenever it outlived the sleep — routine on a loaded fleet
  // run — the one-shot read missed the row and the test failed, then passed on
  // retry. That is what made team-chat flaky. Poll until it lands: correct under
  // any load, and faster than the fixed sleep in the common case.
  let sent: { id: string; content: string } | undefined
  await expect
    .poll(
      async () => {
        const res = await page.request.get(`${API_BASE}/messages?channel_id=${channel.id}`, {
          headers: authHeaders(accessToken),
        })
        const rows = (await res.json()) as { id: string; content: string }[]
        sent = rows.find((m) => m.content === 'journey message body')
        return Boolean(sent)
      },
      { timeout: 15_000, message: 'sent message must round-trip' },
    )
    .toBe(true)

  // 5) open the thread for that message and post a reply
  await page.goto(APP_BASE + `/channels/${channel.id}/threads/${sent!.id}`)
  await expect(page.locator('[data-mol-id="thread-parent"]')).toBeVisible({ timeout: 5000 })
  await page.locator('[data-mol-id="thread-reply-input"]').fill('journey reply body')
  await page.locator('[data-mol-id="thread-reply-send"]').click()
  // Same fixed-sleep race as the message send above — poll instead.
  await expect
    .poll(
      async () => {
        const res = await page.request.get(`${API_BASE}/threads/${sent!.id}/replies`, {
          headers: authHeaders(accessToken),
        })
        const rows = (await res.json()) as { content: string }[]
        return rows.some((r) => r.content === 'journey reply body')
      },
      { timeout: 15_000, message: 'posted reply must round-trip' },
    )
    .toBe(true)

  // 6) settings → log out clears the JWT and lands on /login
  await page.goto(APP_BASE + '/settings')
  await page.locator('[data-mol-id="settings-logout"]').click()
  await page.waitForURL('**/login', { timeout: 10000 })
  const tokenAfter = await getAccessToken(page)
  expect(tokenAfter).toBeFalsy()
})
