/**
 * Feedback spec.
 *
 * The conversation detail page exposes thumbs-up / thumbs-down buttons.
 * They POST to /api/feedback with rating 1 or 5 and the conversation id.
 * The /api/feedback handler is owner-scoped and refuses non-owner
 * conversation ids.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, apiPost, signup } from './_helpers.js'

interface ConversationRow {
  id: string
}
interface FeedbackRow {
  id: string
  conversation_id: string
  rating: number
}

test.describe('/feedback', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('owner can post feedback against their own conversation', async ({ page }) => {
    const conv = await apiPost<ConversationRow>(page, '/conversations', {
      customerName: 'Rater',
      initialMessage: 'thanks',
      autoReply: false,
    })
    const created = await apiPost<FeedbackRow>(page, '/feedback', {
      conversation_id: conv.id,
      rating: 5,
      comment: 'great answer',
    })
    expect(created.rating).toBe(5)
    expect(created.conversation_id).toBe(conv.id)
    const list = await apiGet<FeedbackRow[]>(page, `/feedback?conversation_id=${conv.id}`)
    expect(list.some((f) => f.id === created.id)).toBe(true)
  })

  test("non-owner cannot post feedback against another user's conversation", async ({
    page,
    context,
  }) => {
    // First user creates a conversation.
    const conv = await apiPost<ConversationRow>(page, '/conversations', {
      customerName: 'Owner',
      initialMessage: 'hi',
      autoReply: false,
    })

    // Second user (fresh context) tries to post feedback against it.
    const otherPage = await context.newPage()
    await signup(otherPage)
    const res = await otherPage.request.post(
      'http://localhost:' + (process.env.API_PORT || '4000') + '/api/feedback',
      {
        headers: {
          Cookie: (await otherPage.context().cookies())
            .map((c) => `${c.name}=${c.value}`)
            .join('; '),
          'Content-Type': 'application/json',
        },
        data: { conversation_id: conv.id, rating: 1 },
      },
    )
    // Owner-scoped: returns 404 to avoid leaking existence.
    expect([403, 404]).toContain(res.status())
    await otherPage.close()
  })
})
