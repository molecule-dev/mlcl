import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  addQuestion,
  authedRequest,
  createSurvey,
  publishSurvey,
  signup,
  submitPublicResponse,
} from './_helpers.js'

test.describe('publish + public submit', () => {
  test('publish auto-generates slug; /api/surveys/by-slug serves it; submission persists', async ({
    page,
  }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Public Pulse')
    const nps = await addQuestion(page, u.accessToken, s.id, {
      type: 'nps',
      text: 'Recommend?',
    })
    const published = await publishSurvey(page, u.accessToken, s.id)
    expect(published.status).toBe('published')
    expect(published.slug, 'publish auto-generates a slug').toBeTruthy()

    const publicGet = await page.request.get(
      `${process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'}/surveys/by-slug/${published.slug}`,
    )
    expect(publicGet.status()).toBe(200)
    const publicBody = (await publicGet.json()) as {
      id: string
      questions: Array<{ id: string; type: string }>
    }
    expect(publicBody.id).toBe(s.id)
    expect(publicBody.questions.find((q) => q.type === 'nps')).toBeTruthy()

    const submitted = await submitPublicResponse(
      page,
      { slug: published.slug ?? undefined },
      { answers: { [nps.id]: 9 }, score: 9, respondent_email: 'r1@example.com' },
    )
    expect(submitted.id).toMatch(/[0-9a-f-]{36}/)

    const list = await authedRequest(page, u.accessToken, 'GET', `/responses?survey_id=${s.id}`)
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as Array<{
      id: string
      score: number | null
      answers: Record<string, unknown>
    }>
    expect(rows.length).toBe(1)
    // score must come back as a number (was string from PG numeric before fix)
    expect(typeof rows[0].score).toBe('number')
    expect(rows[0].score).toBe(9)
    // answers keyed by question id
    expect(rows[0].answers[nps.id]).toBe(9)
  })

  test('submitting to a closed survey is rejected', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Close Me')
    const q = await addQuestion(page, u.accessToken, s.id, { type: 'short_text', text: 'q' })
    const published = await publishSurvey(page, u.accessToken, s.id)
    const close = await authedRequest(page, u.accessToken, 'POST', `/surveys/${s.id}/close`)
    expect(close.status()).toBe(200)
    const submitRes = await page.request.post(
      `${process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'}/responses`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { slug: published.slug, answers: { [q.id]: 'hi' } },
      },
    )
    expect(submitRes.status(), 'closed survey must reject responses').toBe(410)
  })
})
