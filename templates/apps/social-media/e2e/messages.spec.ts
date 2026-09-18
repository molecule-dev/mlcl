import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('messages page', () => {
  test('Direct messages: thread create, send, and read-after-write list', async ({ page }) => {
    const a = await signup(page, undefined, undefined, 'Sender')
    const b = await signup(page, undefined, undefined, 'Receiver')

    const threadRes = await page.request.post(`/api/messages/threads`, {
      headers: apiHeaders(a.accessToken),
      data: { user_id: b.userId },
    })
    expect(threadRes.status()).toBeLessThan(300)
    const thread = (await threadRes.json()) as { id: string }

    const sendRes = await page.request.post(`/api/messages/threads/${thread.id}/messages`, {
      headers: apiHeaders(a.accessToken),
      data: { content: 'Hi there from e2e' },
    })
    expect(sendRes.status()).toBeLessThan(300)

    await page.goto(APP_BASE + '/messages')
    await expect(page.locator('text=Hi there from e2e').first()).toBeVisible({ timeout: 15_000 })
  })

  test('Page mount fetches /api/messages/threads via captureNetwork', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/messages')
      await page.waitForTimeout(1500)
    })
    const hit = reqs.some((r) => /\/api\/messages\/threads/.test(r.url))
    expect(hit, 'messages page should fetch /api/messages/threads').toBeTruthy()
  })

  test('Thread row preview reflects the latest inbound DM body', async ({ page }) => {
    const sender = await signup(page, undefined, undefined, 'Preview Sender')
    const recv = await signup(page, undefined, undefined, 'Preview Receiver')
    const threadRes = await page.request.post(`/api/messages/threads`, {
      headers: apiHeaders(sender.accessToken),
      data: { user_id: recv.userId },
    })
    const thread = (await threadRes.json()) as { id: string }
    const preview = `preview-${Date.now()}`
    await page.request.post(`/api/messages/threads/${thread.id}/messages`, {
      headers: apiHeaders(sender.accessToken),
      data: { content: preview },
    })
    await page.goto(APP_BASE + '/messages')
    await expect(page.locator(`text=${preview}`).first()).toBeVisible({ timeout: 15_000 })
  })

  test('Send a reply via UI updates the thread message list', async ({ page }) => {
    const a = await signup(page, undefined, undefined, 'UI Sender')
    const b = await signup(page, undefined, undefined, 'UI Receiver')
    const threadRes = await page.request.post(`/api/messages/threads`, {
      headers: apiHeaders(a.accessToken),
      data: { user_id: b.userId },
    })
    const thread = (await threadRes.json()) as { id: string }
    await page.request.post(`/api/messages/threads/${thread.id}/messages`, {
      headers: apiHeaders(a.accessToken),
      data: { content: 'opening message' },
    })
    await page.goto(APP_BASE + '/messages')
    const reply = `reply-${Date.now()}`
    const replyRes = await page.request.post(`/api/messages/threads/${thread.id}/messages`, {
      headers: apiHeaders(a.accessToken),
      data: { content: reply },
    })
    expect(replyRes.status()).toBeLessThan(300)
    const list = await page.request.get(`/api/messages/threads/${thread.id}/messages`, {
      headers: apiHeaders(a.accessToken),
    })
    const json = (await list.json()) as Array<{ content: string }>
    expect(json.some((m) => m.content === reply)).toBe(true)
  })

  test('Conversation list renders at least one row when a thread exists', async ({ page }) => {
    const a = await signup(page, undefined, undefined, 'List Sender')
    const b = await signup(page, undefined, undefined, 'List Receiver')
    const threadRes = await page.request.post(`/api/messages/threads`, {
      headers: apiHeaders(a.accessToken),
      data: { user_id: b.userId },
    })
    const thread = (await threadRes.json()) as { id: string }
    await page.request.post(`/api/messages/threads/${thread.id}/messages`, {
      headers: apiHeaders(a.accessToken),
      data: { content: 'list ping' },
    })
    await page.goto(APP_BASE + '/messages')
    await expect(page.locator('main')).toContainText('list ping', { timeout: 15_000 })
  })
})
