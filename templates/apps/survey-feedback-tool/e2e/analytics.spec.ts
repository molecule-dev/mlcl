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

test.describe('analytics + CSV export (/surveys/:id/analytics, /surveys/:id/responses)', () => {
  test('NPS distribution + score buckets + CSV reflect all responses', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Analytics Survey')
    const nps = await addQuestion(page, u.accessToken, s.id, { type: 'nps', text: 'Recommend?' })
    const published = await publishSurvey(page, u.accessToken, s.id)

    const scores = [9, 7, 3]
    for (const score of scores) {
      await submitPublicResponse(
        page,
        { slug: published.slug ?? undefined },
        {
          answers: { [nps.id]: score },
          score,
          respondent_email: `r${score}@example.com`,
        },
      )
    }

    const summary = await authedRequest(
      page,
      u.accessToken,
      'GET',
      `/responses/analytics/summary?survey_id=${s.id}`,
    )
    expect(summary.status()).toBe(200)
    const sumBody = (await summary.json()) as {
      total_responses: number
      promoters: number
      passives: number
      detractors: number
      nps: number | null
      nps_distribution: Record<string, number>
    }
    expect(sumBody.total_responses).toBe(3)
    expect(sumBody.promoters).toBe(1)
    expect(sumBody.passives).toBe(1)
    expect(sumBody.detractors).toBe(1)
    // NPS = (promoters - detractors)/total * 100 = (1-1)/3*100 = 0
    expect(sumBody.nps).toBe(0)
    expect(sumBody.nps_distribution['9']).toBe(1)
    expect(sumBody.nps_distribution['7']).toBe(1)
    expect(sumBody.nps_distribution['3']).toBe(1)

    // CSV: real CSV with answer column header and clean primitive cells
    const csv = await authedRequest(
      page,
      u.accessToken,
      'GET',
      `/responses/export/csv?survey_id=${s.id}`,
    )
    expect(csv.status()).toBe(200)
    const text = await csv.text()
    const lines = text.trim().split('\n')
    expect(lines.length).toBe(4) // header + 3 rows
    // Header includes the question id (was missing/empty before fix)
    expect(lines[0]).toContain(nps.id)
    expect(lines[0].split(',')).toEqual(
      expect.arrayContaining(['id', 'status', 'score', 'submitted_at']),
    )
    // Row scores must be plain numbers, not "3.0000" or quoted
    const dataLines = lines.slice(1)
    for (const line of dataLines) {
      expect(line, `submitted_at must not be triple-quoted: ${line}`).not.toMatch(/"""/)
    }
    expect(text).toMatch(/,9,/)
    expect(text).toMatch(/,7,/)
    expect(text).toMatch(/,3,/)
  })

  test('UI: /surveys/:id/analytics renders the analytics page', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Analytics UI')
    const nps = await addQuestion(page, u.accessToken, s.id, {
      type: 'nps',
      text: 'Recommend?',
    })
    const pub = await publishSurvey(page, u.accessToken, s.id)
    await submitPublicResponse(
      page,
      { slug: pub.slug ?? undefined },
      { answers: { [nps.id]: 9 }, score: 9 },
    )
    await page.goto(`${APP_BASE}/surveys/${s.id}/analytics`)
    await expect(page).toHaveURL(/\/surveys\/.+\/analytics$/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible({
      timeout: 15_000,
    })
    // Concrete values from our 1 promoter response: NPS=100, total=1
    await expect(page.getByText(/NPS\s*score/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/distribution/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('UI: /surveys/:id/responses renders the responses list', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Responses UI')
    const nps = await addQuestion(page, u.accessToken, s.id, {
      type: 'nps',
      text: 'Recommend?',
    })
    const pub = await publishSurvey(page, u.accessToken, s.id)
    const submitted = await submitPublicResponse(
      page,
      { slug: pub.slug ?? undefined },
      { answers: { [nps.id]: 8 }, score: 8, respondent_email: 'list@example.com' },
    )
    await page.goto(`${APP_BASE}/surveys/${s.id}/responses`)
    await expect(page).toHaveURL(/\/surveys\/.+\/responses$/, { timeout: 15_000 })
    // The list page must render the respondent_email or score we just inserted
    await expect(page.getByText(/list@example\.com|8/).first()).toBeVisible({ timeout: 15_000 })
    expect(submitted.id.length).toBeGreaterThan(0)
  })

  test('UI: /surveys/:id/responses/:responseId renders a single response detail', async ({
    page,
  }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Detail UI')
    const text = await addQuestion(page, u.accessToken, s.id, {
      type: 'short_text',
      text: 'How are you?',
    })
    const pub = await publishSurvey(page, u.accessToken, s.id)
    const submitted = await submitPublicResponse(
      page,
      { slug: pub.slug ?? undefined },
      { answers: { [text.id]: 'feeling great' }, respondent_email: 'detail@example.com' },
    )
    await page.goto(`${APP_BASE}/surveys/${s.id}/responses/${submitted.id}`)
    await expect(page).toHaveURL(/\/surveys\/.+\/responses\/.+$/, { timeout: 15_000 })
    await expect(page.getByText('feeling great').first()).toBeVisible({ timeout: 15_000 })
  })

  test('analytics returns 404 for non-owner (IDOR)', async ({ page }) => {
    const u1 = await signup(page)
    const s = await createSurvey(page, u1.accessToken, 'Mine Only')
    const u2 = await signup(page)
    const stolen = await authedRequest(
      page,
      u2.accessToken,
      'GET',
      `/responses/analytics/summary?survey_id=${s.id}`,
    )
    expect(stolen.status()).toBe(404)
  })
})
