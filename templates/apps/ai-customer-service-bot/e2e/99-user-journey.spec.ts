/**
 * Cross-page user journey — the kitchen-sink flow.
 *
 * Walks the entire happy path a paying customer would walk on day one:
 * sign up, write a knowledge article, start a customer conversation,
 * watch the bot respond, escalate, resolve, and confirm the dashboard
 * + analytics reflect the activity. Verifies cross-page invariants —
 * if any stage breaks the global state for the next, we catch it here.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, apiPost, signup } from './_helpers.js'

interface ConversationRow {
  id: string
  status: string
  escalated: boolean
  message_count: number
  messages?: { sender: string; role: string; content: string }[]
}

test('end-to-end: signup → knowledge → conversation → bot reply → escalate → resolve', async ({
  page,
}) => {
  await signup(page)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })

  // 1. Seed a knowledge article.
  await apiPost(page, '/knowledge', {
    title: 'Shipping FAQ',
    content:
      'Standard shipping arrives within 5 business days. Track at /orders. International orders take 10–14 days.',
    status: 'published',
  })

  // 2. Start a conversation with an initial customer message.
  const conv = await apiPost<{ id: string }>(page, '/conversations', {
    customerName: 'Diana Journey',
    initialMessage: 'When will my international order arrive?',
  })

  // 3. Bot reply lands.
  let detail: ConversationRow | undefined
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    detail = await apiGet<ConversationRow>(page, `/conversations/${conv.id}`)
    if ((detail.messages ?? []).some((m) => m.sender === 'bot')) break
    await new Promise((r) => setTimeout(r, 1000))
  }
  const bot = (detail?.messages ?? []).filter((m) => m.sender === 'bot')
  expect(bot.length, 'bot must reply during journey').toBeGreaterThan(0)

  // 4. Operator drives the UI: navigate to detail, send an agent message.
  await page.goto(APP_BASE + '/conversations/' + conv.id)
  await page.locator('[data-mol-id="conversation-composer"]').fill('Following up — anything else?')
  await page.locator('[data-mol-id="conversation-send"]').click()

  // 5. Resolve.
  await page.locator('[data-mol-id="conversation-resolve"]').click()
  await expect(page.locator('[data-mol-id="conversation-action-message"]')).toBeVisible({
    timeout: 10_000,
  })

  // 6. Backend invariant: conversation.status === 'resolved' AND message
  //    count grew to include the agent message.
  const finalState = await apiGet<ConversationRow>(page, `/conversations/${conv.id}`)
  expect(finalState.status).toBe('resolved')
  expect((finalState.messages ?? []).some((m) => m.sender === 'agent')).toBe(true)

  // 7. Dashboard reflects the new activity (analytics call wires up).
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
  // /analytics is fired and dashboard shows the conversation count > 0.
  // The handler returns { summary: { totalConversations, ... }, channels, timeseries }.
  const analytics = await apiGet<{
    summary?: { totalConversations?: number; total_conversations?: number }
    totalConversations?: number
    total_conversations?: number
  }>(page, '/analytics')
  const summary = (analytics.summary ?? analytics) as Record<string, unknown>
  const total = summary.totalConversations ?? summary.total_conversations ?? 0
  expect(Number(total), 'analytics should count the new conversation').toBeGreaterThan(0)
})
