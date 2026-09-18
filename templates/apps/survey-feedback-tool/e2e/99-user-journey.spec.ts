import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  addQuestion,
  authedRequest,
  createSurvey,
  publishSurvey,
  signup,
  submitPublicResponse,
} from './_helpers.js'

/**
 * End-to-end user journey for survey-feedback-tool. One user signs up,
 * creates a survey from a seeded NPS template, publishes it, simulates
 * three respondents, then checks analytics, the responses list, the CSV
 * export, and notifications. Each step asserts on the real backend
 * outcome (DB row exists, count matches, CSV is well-formed) and the
 * journey ends with a hard reload to prove persistence.
 *
 * If this passes, a paying customer can use the product. If it fails,
 * the product is broken regardless of unit tests.
 */
test.describe('survey-feedback-tool: full user journey', () => {
  test('signup → apply NPS template → publish → 3 responses → analytics + CSV + notifications', async ({
    page,
  }) => {
    const u = await signup(page)

    // Templates page should NOT be empty: seeded public templates.
    const tplList = await authedRequest(page, u.accessToken, 'GET', '/templates')
    const tplItems = (await tplList.json()) as Array<{
      id: string
      kind: string
      is_public: boolean
    }>
    expect(tplItems.filter((t) => t.is_public).length).toBeGreaterThanOrEqual(3)
    const npsTemplate = tplItems.find((t) => t.kind === 'nps' && t.is_public)
    expect(npsTemplate, 'NPS seed template must exist').toBeTruthy()

    // Apply the template — clones questions into a fresh draft survey.
    const apply = await authedRequest(
      page,
      u.accessToken,
      'POST',
      `/templates/${npsTemplate!.id}/apply`,
    )
    expect(apply.status()).toBe(201)
    const survey = (await apply.json()) as { id: string; status: string }
    expect(survey.status).toBe('draft')

    // Confirm questions came over.
    const detail = await authedRequest(page, u.accessToken, 'GET', `/surveys/${survey.id}`)
    const detailBody = (await detail.json()) as {
      id: string
      questions: Array<{ id: string; type: string }>
    }
    expect(detailBody.questions.length).toBeGreaterThan(0)
    const npsQ = detailBody.questions.find((q) => q.type === 'nps')!
    expect(npsQ).toBeTruthy()

    // Add a multi_choice follow-up via the builder API. This proves the
    // historic frontend bug ('multiple_choice' name) doesn't sneak back.
    const mcq = await addQuestion(page, u.accessToken, survey.id, {
      type: 'multi_choice',
      text: 'Which area?',
      options: ['Sales', 'Support', 'Product'],
    })
    expect(mcq.options).toEqual(['Sales', 'Support', 'Product'])

    // Rename the survey via PATCH (was PUT in the buggy frontend).
    const rename = await authedRequest(page, u.accessToken, 'PATCH', `/surveys/${survey.id}`, {
      title: 'Q3 Customer Pulse',
    })
    expect(rename.status()).toBe(200)

    // Publish — must auto-generate slug.
    const published = await publishSurvey(page, u.accessToken, survey.id)
    expect(published.slug, 'publish must auto-generate slug').toBeTruthy()
    expect(published.status).toBe('published')

    // Three respondents submit through the public route.
    const scores = [9, 7, 3]
    for (const score of scores) {
      await submitPublicResponse(
        page,
        { slug: published.slug ?? undefined },
        {
          answers: {
            [npsQ.id]: score,
            [mcq.id]: ['Support'],
          },
          score,
          respondent_email: `r${score}@example.com`,
        },
      )
    }

    // Survey list must reflect response_count denormalization.
    const refreshed = await authedRequest(page, u.accessToken, 'GET', `/surveys/${survey.id}`)
    const refreshedBody = (await refreshed.json()) as { response_count: number }
    expect(refreshedBody.response_count).toBe(3)

    // Analytics: 1 promoter, 1 passive, 1 detractor → NPS 0.
    const summary = await authedRequest(
      page,
      u.accessToken,
      'GET',
      `/responses/analytics/summary?survey_id=${survey.id}`,
    )
    const sumBody = (await summary.json()) as {
      total_responses: number
      promoters: number
      passives: number
      detractors: number
      nps: number
    }
    expect(sumBody.total_responses).toBe(3)
    expect(sumBody.promoters).toBe(1)
    expect(sumBody.passives).toBe(1)
    expect(sumBody.detractors).toBe(1)
    expect(sumBody.nps).toBe(0)

    // Responses list returns numeric scores (PG numeric coerced).
    const listResp = await authedRequest(
      page,
      u.accessToken,
      'GET',
      `/responses?survey_id=${survey.id}`,
    )
    const listBody = (await listResp.json()) as Array<{ score: number }>
    expect(listBody.length).toBe(3)
    for (const r of listBody) expect(typeof r.score).toBe('number')

    // CSV export: three rows, header includes question ids, no triple quotes.
    const csv = await authedRequest(
      page,
      u.accessToken,
      'GET',
      `/responses/export/csv?survey_id=${survey.id}`,
    )
    expect(csv.status()).toBe(200)
    const csvText = await csv.text()
    const lines = csvText.trim().split('\n')
    expect(lines.length).toBe(4)
    expect(lines[0]).toContain(npsQ.id)
    expect(csvText).not.toMatch(/"""/)

    // Notifications: one per response.
    const notif = await authedRequest(page, u.accessToken, 'GET', '/notifications')
    const notifBody = (await notif.json()) as { items: Array<unknown>; unread_count: number }
    expect(notifBody.items.length).toBe(3)
    expect(notifBody.unread_count).toBe(3)

    // SPA reload: the survey title still shows on /surveys.
    await page.goto(APP_BASE + '/surveys')
    await page.reload()
    await page.waitForResponse(
      (resp) => resp.url().endsWith('/api/surveys') && resp.status() === 200,
      { timeout: 15_000 },
    )
    await expect(page.getByText('Q3 Customer Pulse').first()).toBeVisible({ timeout: 15_000 })
  })
})
