import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  addQuestion,
  authedRequest,
  createSurvey,
  publishSurvey,
  signup,
  submitPublicResponse,
} from './_helpers.js'

test.describe('notifications', () => {
  test('public response submission creates a survey_notifications row for the owner', async ({
    page,
  }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Notify Survey')
    const q = await addQuestion(page, u.accessToken, s.id, { type: 'short_text', text: 'q' })
    const published = await publishSurvey(page, u.accessToken, s.id)

    const before = await authedRequest(page, u.accessToken, 'GET', '/notifications')
    const beforeBody = (await before.json()) as {
      items: Array<unknown>
      unread_count: number
    }
    expect(beforeBody.items.length).toBe(0)
    expect(beforeBody.unread_count).toBe(0)

    await submitPublicResponse(
      page,
      { slug: published.slug ?? undefined },
      { answers: { [q.id]: 'great' }, respondent_email: 'happy@example.com' },
    )

    const after = await authedRequest(page, u.accessToken, 'GET', '/notifications')
    expect(after.status()).toBe(200)
    const afterBody = (await after.json()) as {
      items: Array<{
        id: string
        kind: string
        payload: { survey_id?: string; survey_title?: string; respondent_email?: string }
      }>
      unread_count: number
    }
    expect(afterBody.items.length).toBe(1)
    expect(afterBody.unread_count).toBe(1)
    const n = afterBody.items[0]
    expect(n.kind).toBe('response_received')
    expect(n.payload.survey_id).toBe(s.id)
    expect(n.payload.survey_title).toBe('Notify Survey')
    expect(n.payload.respondent_email).toBe('happy@example.com')
  })

  test('PATCH /notifications/:id { read: true } decrements unread count', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Mark Read')
    const q = await addQuestion(page, u.accessToken, s.id, { type: 'short_text', text: 'q' })
    const published = await publishSurvey(page, u.accessToken, s.id)
    await submitPublicResponse(
      page,
      { slug: published.slug ?? undefined },
      { answers: { [q.id]: 'a' } },
    )
    await submitPublicResponse(
      page,
      { slug: published.slug ?? undefined },
      { answers: { [q.id]: 'b' } },
    )

    const list = await authedRequest(page, u.accessToken, 'GET', '/notifications')
    const body = (await list.json()) as {
      items: Array<{ id: string }>
      unread_count: number
    }
    expect(body.unread_count).toBe(2)

    const patch = await authedRequest(
      page,
      u.accessToken,
      'PATCH',
      `/notifications/${body.items[0].id}`,
      { read: true },
    )
    expect(patch.status()).toBe(200)

    const refreshed = await authedRequest(page, u.accessToken, 'GET', '/notifications')
    const refreshedBody = (await refreshed.json()) as { unread_count: number }
    expect(refreshedBody.unread_count).toBe(1)
  })

  test('mark-all-read clears unread count', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Mark All')
    const q = await addQuestion(page, u.accessToken, s.id, { type: 'short_text', text: 'q' })
    const published = await publishSurvey(page, u.accessToken, s.id)
    for (let i = 0; i < 3; i += 1) {
      await submitPublicResponse(
        page,
        { slug: published.slug ?? undefined },
        { answers: { [q.id]: `r${i}` } },
      )
    }
    const all = await authedRequest(page, u.accessToken, 'POST', '/notifications/mark-all-read')
    expect(all.status()).toBe(200)
    const after = await authedRequest(page, u.accessToken, 'GET', '/notifications')
    const body = (await after.json()) as { unread_count: number }
    expect(body.unread_count).toBe(0)
  })
})
