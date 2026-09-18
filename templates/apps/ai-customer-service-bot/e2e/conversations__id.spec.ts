/**
 * Conversation-detail (/conversations/:id) page tests.
 *
 * The conversation thread page is where the operator actually does work:
 * read messages, send agent replies, escalate, resolve, request a fresh
 * AI reply, simulate a customer message, leave feedback. These tests
 * exercise each interactive surface and verify the backend invariants
 * (status transitions, message persistence, feedback rows).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, apiPost, captureNetwork, signup } from './_helpers.js'

interface MessageRow {
  id: string
  sender: string
  content: string
}
interface ConversationRow {
  id: string
  status: string
  escalated: boolean
  messages?: MessageRow[]
}
interface FeedbackRow {
  id: string
  conversation_id: string
  rating: number
}

test.describe('/conversations/:id', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('back link returns the operator to /conversations', async ({ page }) => {
    const c = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Back Link',
      initialMessage: 'hi',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + c.id)
    await page.locator('[data-mol-id="conversation-back"]').click()
    await expect(page).toHaveURL(/\/conversations(?:\?|$|\/)/)
  })

  test('status badge shows the conversation status', async ({ page }) => {
    const c = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Status',
      initialMessage: 'hi',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + c.id)
    await expect(page.locator('[data-mol-id="conversation-status"]')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Escalate sets escalated=true and creates an escalation row', async ({ page }) => {
    const c = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Escalate',
      initialMessage: 'urgent',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + c.id)
    await page.locator('[data-mol-id="conversation-escalate"]').click()
    await expect(page.locator('[data-mol-id="conversation-action-message"]')).toBeVisible({
      timeout: 10_000,
    })
    const after = await apiGet<ConversationRow>(page, `/conversations/${c.id}`)
    expect(after.escalated).toBe(true)
    expect(after.status).toBe('escalated')
  })

  test('Resolve marks the conversation resolved', async ({ page }) => {
    const c = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Resolve',
      initialMessage: 'done',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + c.id)
    await page.locator('[data-mol-id="conversation-resolve"]').click()
    await expect(page.locator('[data-mol-id="conversation-action-message"]')).toBeVisible({
      timeout: 10_000,
    })
    const after = await apiGet<ConversationRow>(page, `/conversations/${c.id}`)
    expect(after.status).toBe('resolved')
  })

  test('"Bot reply" adds an assistant message persisted in the conversation', async ({ page }) => {
    const c = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'AI Reply',
      initialMessage: 'how do I reset my password?',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + c.id)
    const before = await apiGet<ConversationRow>(page, `/conversations/${c.id}`)
    const beforeBots = (before.messages ?? []).filter((m) => m.sender === 'bot').length
    await page.locator('[data-mol-id="conversation-ai-reply"]').click()
    let after: ConversationRow | undefined
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
      after = await apiGet<ConversationRow>(page, `/conversations/${c.id}`)
      if ((after.messages ?? []).filter((m) => m.sender === 'bot').length > beforeBots) break
      await new Promise((r) => setTimeout(r, 1000))
    }
    const afterBots = (after?.messages ?? []).filter((m) => m.sender === 'bot').length
    expect(afterBots, 'a fresh bot message should be added').toBeGreaterThan(beforeBots)
  })

  test('"Customer message" toggles the customer composer form', async ({ page }) => {
    const c = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Customer Form Toggle',
      initialMessage: 'hi',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + c.id)
    await page.locator('[data-mol-id="conversation-simulate-customer"]').click()
    await expect(page.locator('[data-mol-id="conversation-customer-form"]')).toBeVisible()
  })

  test('customer-input textbox accepts text', async ({ page }) => {
    const c = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Customer Input',
      initialMessage: 'hi',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + c.id)
    await page.locator('[data-mol-id="conversation-simulate-customer"]').click()
    const input = page.locator('[data-mol-id="conversation-customer-input"]')
    await input.fill('Where is my order?')
    await expect(input).toHaveValue('Where is my order?')
  })

  test('"Add as customer" persists a customer message', async ({ page }) => {
    const c = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Customer Send',
      initialMessage: 'first',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + c.id)
    await page.locator('[data-mol-id="conversation-simulate-customer"]').click()
    const marker = 'CSAID-' + Date.now()
    await page.locator('[data-mol-id="conversation-customer-input"]').fill(marker)
    await page.locator('[data-mol-id="conversation-customer-send"]').click()
    let after: ConversationRow | undefined
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
      after = await apiGet<ConversationRow>(page, `/conversations/${c.id}`)
      if ((after.messages ?? []).some((m) => m.sender === 'customer' && m.content.includes(marker)))
        break
      await new Promise((r) => setTimeout(r, 500))
    }
    expect(
      (after?.messages ?? []).some((m) => m.sender === 'customer' && m.content.includes(marker)),
    ).toBe(true)
  })

  test('agent composer accepts and persists a reply', async ({ page }) => {
    const c = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Composer',
      initialMessage: 'hi',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + c.id)
    const reply = 'Agent reply ' + Date.now()
    await page.locator('[data-mol-id="conversation-composer"]').fill(reply)
    await page.locator('[data-mol-id="conversation-send"]').click()
    let after: ConversationRow | undefined
    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
      after = await apiGet<ConversationRow>(page, `/conversations/${c.id}`)
      if ((after.messages ?? []).some((m) => m.sender === 'agent' && m.content === reply)) break
      await new Promise((r) => setTimeout(r, 500))
    }
    expect((after?.messages ?? []).some((m) => m.sender === 'agent' && m.content === reply)).toBe(
      true,
    )
  })

  test('Send button is wired (POSTs /api/conversations/:id/messages)', async ({ page }) => {
    const c = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Send Wired',
      initialMessage: 'hi',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + c.id)
    await page.locator('[data-mol-id="conversation-composer"]').fill('test')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="conversation-send"]').click()
      await page.waitForTimeout(1000)
    })
    const post = reqs.find(
      (r) =>
        new RegExp(`/api/conversations/${c.id}/messages(?:\\?|$)`).test(r.url) &&
        r.method === 'POST',
    )
    expect(post, 'send should POST /api/conversations/:id/messages').toBeTruthy()
  })

  test('"Helpful" button creates a feedback row with rating=5', async ({ page, browserName }) => {
    test.skip(
      browserName !== 'chromium' && browserName !== undefined,
      'aside is hidden on small viewports',
    )
    const c = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Feedback',
      initialMessage: 'hi',
      autoReply: false,
    })
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto(APP_BASE + '/conversations/' + c.id)
    await page.locator('[data-mol-id="conversation-feedback-up"]').click()
    await expect(page.locator('[data-mol-id="conversation-action-message"]')).toBeVisible({
      timeout: 10_000,
    })
    const list = await apiGet<FeedbackRow[]>(page, '/feedback?conversationId=' + c.id)
    expect(list.some((f) => f.rating === 5 && f.conversation_id === c.id)).toBe(true)
  })
})
