import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, addQuestion, authedRequest, createSurvey, signup } from './_helpers.js'

test.describe('builder (/surveys/:id/build)', () => {
  test('add multi_choice question — backend persists options', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Build Test')
    const q = await addQuestion(page, u.accessToken, s.id, {
      type: 'multi_choice',
      text: 'Pick one',
      options: ['A', 'B', 'C'],
    })
    expect(q.type).toBe('multi_choice')
    expect(q.options).toEqual(['A', 'B', 'C'])

    const surveyAfter = await authedRequest(page, u.accessToken, 'GET', `/surveys/${s.id}`)
    expect(surveyAfter.status()).toBe(200)
    const body = (await surveyAfter.json()) as {
      questions: Array<{ id: string; type: string; options: string[] | null }>
    }
    const found = body.questions.find((x) => x.id === q.id)
    expect(found?.type).toBe('multi_choice')
    expect(found?.options).toEqual(['A', 'B', 'C'])
  })

  test('PATCH question persists changes', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Patch Q Test')
    const q = await addQuestion(page, u.accessToken, s.id, {
      type: 'short_text',
      text: 'Original',
    })
    const patch = await authedRequest(page, u.accessToken, 'PATCH', `/questions/${q.id}`, {
      text: 'Updated text',
      required: true,
    })
    expect(patch.status()).toBe(200)
    const re = await authedRequest(page, u.accessToken, 'GET', `/surveys/${s.id}`)
    const body = (await re.json()) as {
      questions: Array<{ id: string; text: string; required: boolean }>
    }
    const updated = body.questions.find((x) => x.id === q.id)
    expect(updated?.text).toBe('Updated text')
    expect(updated?.required).toBe(true)
  })

  test('legacy frontend names are rejected by backend (multiple_choice)', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Legacy Test')
    const res = await authedRequest(page, u.accessToken, 'POST', '/questions', {
      survey_id: s.id,
      type: 'multiple_choice',
      text: 'Should fail',
    })
    expect(
      res.status(),
      'multiple_choice was renamed to multi_choice; old name must be rejected',
    ).toBeGreaterThanOrEqual(400)
  })

  test('UI: visiting /surveys/:id/build renders the builder', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'UI Builder Test')
    await page.goto(`${APP_BASE}/surveys/${s.id}/build`)
    await expect(page).toHaveURL(/\/surveys\/.+\/build$/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /build your survey/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('textbox', { name: /survey title/i })).toHaveValue(
      'UI Builder Test',
    )
  })

  test('PUT to /surveys/:id is not the supported method', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Method Test')
    const put = await page.request.fetch(
      `http://localhost:${process.env.API_PORT || '4000'}/api/surveys/${s.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${u.accessToken}`,
          'Content-Type': 'application/json',
        },
        data: { title: 'should not change' },
      },
    )
    // Important regression: the frontend used to fire PUT — backend only
    // serves PATCH. PUT must not be a 200 success route.
    expect([404, 405]).toContain(put.status())
  })
})
