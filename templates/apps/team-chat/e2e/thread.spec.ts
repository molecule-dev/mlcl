/**
 * /channels/:channelId/threads/:messageId — thread page. We assert that
 * the parent message renders the seeded sender + content (no "Alex Chen"
 * sample fallback), that replies persist via POST
 * /api/threads/:messageId/replies, and that an invalid messageId shows
 * the "not found" path.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiSignupAndPrime,
  apiSignupProAndPrime,
  authHeaders,
  seedChannel,
  seedMessage,
  uniqueEmail,
} from './_helpers.js'

test.describe('thread page', () => {
  test('shows "not found" when the messageId does not exist', async ({ page }) => {
    const { accessToken } = await apiSignupAndPrime(page, uniqueEmail('thr-404'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-thread-404' })
    await page.goto(APP_BASE + `/channels/${ch.id}/threads/00000000-0000-0000-0000-000000000000`)
    await expect(page.locator('[data-mol-id="thread-not-found"]')).toBeVisible({ timeout: 5000 })
  })

  test('renders the parent message with the actual sender content', async ({ page }) => {
    const { accessToken } = await apiSignupAndPrime(
      page,
      uniqueEmail('thr-parent'),
      'TestPass123!',
      'Thread Author',
    )
    const ch = await seedChannel(page, accessToken, { name: 'qa-thread-parent' })
    const msg = await seedMessage(page, accessToken, ch.id, 'parent message body for spec')
    await page.goto(APP_BASE + `/channels/${ch.id}/threads/${msg.id}`)
    const parent = page.locator('[data-mol-id="thread-parent"]')
    await expect(parent).toBeVisible({ timeout: 5000 })
    await expect(parent).toContainText('parent message body for spec')
  })

  test('replies list reflects /api/threads/:messageId/replies', async ({ page }) => {
    // Threads are a Pro+ feature — sign up a Pro user so the reply POST is
    // not blocked by the entitlements gate.
    const { accessToken } = await apiSignupProAndPrime(page, uniqueEmail('thr-list'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-thread-list' })
    const msg = await seedMessage(page, accessToken, ch.id, 'parent for replies')
    const replyRes = await page.request.post(`${API_BASE}/threads/${msg.id}/replies`, {
      headers: authHeaders(accessToken),
      data: { content: 'first reply for spec' },
      failOnStatusCode: false,
    })
    expect(replyRes.status(), await replyRes.text().catch(() => '')).toBe(201)
    await page.goto(APP_BASE + `/channels/${ch.id}/threads/${msg.id}`)
    const replies = page.locator('[data-mol-id="thread-replies"]')
    await expect(replies).toBeVisible({ timeout: 5000 })
    await expect(replies).toContainText('first reply for spec')
  })

  test('reply input accepts text', async ({ page }) => {
    const { accessToken } = await apiSignupAndPrime(page, uniqueEmail('thr-input'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-thread-input' })
    const msg = await seedMessage(page, accessToken, ch.id, 'parent for input test')
    await page.goto(APP_BASE + `/channels/${ch.id}/threads/${msg.id}`)
    const input = page.locator('[data-mol-id="thread-reply-input"]')
    await expect(input).toBeVisible({ timeout: 5000 })
    await input.fill('typed-reply-value')
    await expect(input).toHaveValue('typed-reply-value')
  })

  test('submitting a reply persists exactly one row to /api/threads/:messageId/replies', async ({
    page,
  }) => {
    // Threads are a Pro+ feature — sign up a Pro user so the UI POST from
    // the reply input is not 403'd by the entitlements gate.
    const { accessToken } = await apiSignupProAndPrime(page, uniqueEmail('thr-send'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-thread-send' })
    const msg = await seedMessage(page, accessToken, ch.id, 'parent for send test')
    await page.goto(APP_BASE + `/channels/${ch.id}/threads/${msg.id}`)
    const input = page.locator('[data-mol-id="thread-reply-input"]')
    await expect(input).toBeVisible({ timeout: 5000 })
    await input.fill('reply submitted from spec')
    await page.locator('[data-mol-id="thread-reply-send"]').click()
    // Was: waitForTimeout(1000) + a SINGLE read, so a send slower than the sleep
    // failed the assertion and passed on retry — a flaky test, not a broken app.
    // Poll for exactly one matching reply: still proves no double-submit, but
    // waits for the round-trip instead of guessing how long it takes.
    await expect
      .poll(
        async () => {
          const res = await page.request.get(`${API_BASE}/threads/${msg.id}/replies`, {
            headers: authHeaders(accessToken),
          })
          const rows = (await res.json()) as { content: string }[]
          return rows.filter((r) => r.content === 'reply submitted from spec').length
        },
        { timeout: 15_000, message: 'reply must round-trip exactly once' },
      )
      .toBe(1)
  })
})
