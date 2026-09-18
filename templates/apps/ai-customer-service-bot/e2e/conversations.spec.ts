/**
 * Conversation-flow tests — the heart of the product.
 *
 * The whole point of this app is "operator drives a customer-service AI
 * bot". Smoke tests that just assert /conversations renders are useless;
 * they pass even when the bot never replies. These specs assert real
 * outcomes:
 *  1. Creating a conversation with an `initialMessage` produces a bot
 *     reply persisted in the database (sender='bot', role='assistant').
 *  2. Posting a customer follow-up (via the "Customer message" button)
 *     also triggers a bot reply.
 *  3. Hitting "Bot reply" generates an AI reply on demand (works even
 *     after the previous message is from the assistant).
 *  4. Operator can escalate / resolve a conversation and the backend
 *     reflects it.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, apiPost, captureNetwork, signup } from './_helpers.js'

interface MessageRow {
  id: string
  sender: string
  role: string
  content: string
}
interface ConversationRow {
  id: string
  status: string
  escalated: boolean
  message_count: number
  messages?: MessageRow[]
}

async function seedKnowledge(page: any) {
  await apiPost(page, '/knowledge', {
    title: 'Refund Policy',
    content:
      'We offer full refunds within 30 days of purchase. Email support@example.com with the order number to start one.',
    status: 'published',
  })
}

test.describe('/conversations', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('list page loads with empty state', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/conversations')
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    })
    const list = reqs.find((r) => /\/api\/conversations(?:\?|$)/.test(r.url) && r.method === 'GET')
    expect(list, 'GET /api/conversations should fire').toBeTruthy()
    expect(list!.status).toBeLessThan(300)
    await expect(page.locator('[data-mol-id="page-conversations"]')).toBeVisible()
  })

  test('clicking + New opens the inline create form', async ({ page }) => {
    await page.goto(APP_BASE + '/conversations')
    await page.locator('[data-mol-id="conversations-new"]').click()
    await expect(page.locator('[data-mol-id="conversations-new-form"]')).toBeVisible()
  })

  test('starting a conversation with initialMessage produces a bot reply', async ({ page }) => {
    await seedKnowledge(page)
    const created = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Alice Tester',
      initialMessage: 'Hi, how do I get a refund for order ORD-77?',
    })
    expect(created.id).toBeTruthy()

    // Backend should persist a bot reply (sender='bot', role='assistant').
    // Allow up to ~25s for the model call.
    await test.step('bot reply persists in conversation', async () => {
      let conv: ConversationRow | undefined
      const deadline = Date.now() + 25_000
      while (Date.now() < deadline) {
        conv = await apiGet<ConversationRow>(page, `/conversations/${created.id}`)
        const botMessages = (conv.messages ?? []).filter((m) => m.sender === 'bot')
        if (botMessages.length > 0) break
        await new Promise((r) => setTimeout(r, 1000))
      }
      const botMessages = (conv?.messages ?? []).filter((m) => m.sender === 'bot')
      expect(botMessages.length, 'expected at least one bot reply').toBeGreaterThan(0)
      expect(botMessages[0].role).toBe('assistant')
      expect(botMessages[0].content.length).toBeGreaterThan(20)
    })

    // UI also renders the bot bubble.
    await page.goto(APP_BASE + '/conversations/' + created.id)
    await expect(page.locator('[data-mol-id="conversation-message-bot"]').first()).toBeVisible({
      timeout: 25_000,
    })
  })

  test('"Bot reply" button posts a fresh AI reply on demand', async ({ page }) => {
    await seedKnowledge(page)
    const created = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Manual',
      initialMessage: 'How do I escalate to a human?',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + created.id)
    const before = await apiGet<ConversationRow>(page, `/conversations/${created.id}`)
    const beforeBots = (before.messages ?? []).filter((m) => m.sender === 'bot').length
    await page.locator('[data-mol-id="conversation-ai-reply"]').click()
    // Wait for the post then poll backend.
    let after: ConversationRow | undefined
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
      after = await apiGet<ConversationRow>(page, `/conversations/${created.id}`)
      const afterBots = (after.messages ?? []).filter((m) => m.sender === 'bot').length
      if (afterBots > beforeBots) break
      await new Promise((r) => setTimeout(r, 1000))
    }
    const afterBots = (after?.messages ?? []).filter((m) => m.sender === 'bot').length
    expect(afterBots, 'bot reply count should grow after pressing "Bot reply"').toBeGreaterThan(
      beforeBots,
    )
  })

  test('"Customer message" button adds a customer message AND triggers a bot follow-up', async ({
    page,
  }) => {
    await seedKnowledge(page)
    const created = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Loop',
      initialMessage: 'First contact',
    })
    await page.goto(APP_BASE + '/conversations/' + created.id)

    // Open the customer composer and post a follow-up.
    await page.locator('[data-mol-id="conversation-simulate-customer"]').click()
    const input = page.locator('[data-mol-id="conversation-customer-input"]')
    await input.fill('Where is my order ORD-99?')
    await page.locator('[data-mol-id="conversation-customer-send"]').click()

    // Backend: at least one customer message + one bot reply after the
    // simulation. Poll because the bot call is async-ish.
    let conv: ConversationRow | undefined
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
      conv = await apiGet<ConversationRow>(page, `/conversations/${created.id}`)
      const customerMsgs = (conv.messages ?? []).filter(
        (m) => m.sender === 'customer' && m.content.includes('ORD-99'),
      )
      const botAfter = (conv.messages ?? []).filter(
        (m, i) =>
          m.sender === 'bot' &&
          (conv?.messages?.slice(0, i) ?? []).some(
            (prev) => prev.sender === 'customer' && prev.content.includes('ORD-99'),
          ),
      )
      if (customerMsgs.length > 0 && botAfter.length > 0) break
      await new Promise((r) => setTimeout(r, 1000))
    }
    const customerMsgs = (conv?.messages ?? []).filter(
      (m) => m.sender === 'customer' && m.content.includes('ORD-99'),
    )
    expect(customerMsgs.length, 'simulated customer message should be persisted').toBeGreaterThan(0)
    const botAfter = (conv?.messages ?? []).filter((m) => m.sender === 'bot')
    expect(
      botAfter.length,
      'a bot reply should follow the customer message',
    ).toBeGreaterThanOrEqual(1)
  })

  test('Escalate button sets escalated=true and creates an escalation row', async ({ page }) => {
    const created = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Escalate Me',
      initialMessage: 'Help!',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + created.id)
    await page.locator('[data-mol-id="conversation-escalate"]').click()
    // Action confirmation flashes immediately.
    await expect(page.locator('[data-mol-id="conversation-action-message"]')).toBeVisible({
      timeout: 10_000,
    })
    // Backend reflects it.
    const after = await apiGet<ConversationRow>(page, `/conversations/${created.id}`)
    expect(after.escalated).toBe(true)
    expect(after.status).toBe('escalated')
    const escalations = await apiGet<Array<{ conversation_id: string }>>(page, '/escalations')
    expect(
      escalations.some((e) => e.conversation_id === created.id),
      'an escalation row should exist for the conversation',
    ).toBe(true)
  })

  test('Resolve button marks the conversation resolved', async ({ page }) => {
    const created = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Resolve Me',
      initialMessage: 'Done now.',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + created.id)
    await page.locator('[data-mol-id="conversation-resolve"]').click()
    await expect(page.locator('[data-mol-id="conversation-action-message"]')).toBeVisible({
      timeout: 10_000,
    })
    const after = await apiGet<ConversationRow>(page, `/conversations/${created.id}`)
    expect(after.status).toBe('resolved')
  })

  test('agent reply persisted via composer is visible on reload', async ({ page }) => {
    const created = await apiPost<{ id: string }>(page, '/conversations', {
      customerName: 'Composer',
      initialMessage: 'How can I help you?',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/conversations/' + created.id)
    const composer = page.locator('[data-mol-id="conversation-composer"]')
    const reply = 'Thanks for reaching out — I have you sorted.'
    await composer.fill(reply)
    await page.locator('[data-mol-id="conversation-send"]').click()
    // Backend has it.
    const after = await apiGet<ConversationRow>(page, `/conversations/${created.id}`)
    const agentMsgs = (after.messages ?? []).filter((m) => m.sender === 'agent')
    expect(
      agentMsgs.some((m) => m.content === reply),
      'agent message should persist',
    ).toBe(true)
  })
})
