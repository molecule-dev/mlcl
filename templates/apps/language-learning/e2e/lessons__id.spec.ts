import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedApi,
  captureNetwork,
  getFirstLessonId,
  getFirstLessonWithExercises,
  signup,
  whereUrl,
} from './_helpers.js'

test.describe('/lessons/:id', () => {
  test('exercises render after fetch', async ({ page }) => {
    await signup(page)
    const lessonId = await getFirstLessonId(page)
    await page.goto(APP_BASE + '/lessons/' + lessonId)
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    // The Check button is the primary action — its presence proves an
    // exercise rendered.
    await expect(page.getByRole('button', { name: /Check/i }).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('GET /api/lessons/:id/exercises fires on load', async ({ page }) => {
    await signup(page)
    const lessonId = await getFirstLessonId(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/lessons/' + lessonId)
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const get = whereUrl(reqs, /\/api\/lessons\/[^/]+\/exercises/, 'GET')
    expect(get.length, 'GET /api/lessons/:id/exercises fired').toBeGreaterThan(0)
    expect(get[0].status, 'exercises status').toBe(200)
  })

  test('submitting a correct answer persists exercise_results (XP > 0 in summary)', async ({
    page,
    request,
  }) => {
    const { accessToken } = await signup(page)
    expect(accessToken).toBeTruthy()
    const api = authedApi(request, accessToken!)
    // Pull the first exercise of whichever lesson the catalog carries
    // exercises for (naming a seeded lesson id breaks once the demo course is
    // replaced) and submit its correct answer directly via the API. Then
    // assert that the summary endpoint shows today_xp > 0 — proves the
    // exercise_result row was actually persisted (not just an action toast).
    const { exercises } = await getFirstLessonWithExercises(api)
    expect(exercises.length, 'lesson has exercises').toBeGreaterThan(0)
    const ex = exercises[0]
    const submit = await api.post(`/exercises/${ex.id}/submit`, {
      answer: ex.correct_answer,
      time_taken_ms: 1500,
    })
    expect(submit.status(), 'submit status').toBe(201)
    const submitBody = (await submit.json()) as { is_correct: boolean; xp_earned: number }
    expect(submitBody.is_correct, 'correct answer marked correct').toBe(true)
    expect(submitBody.xp_earned, 'XP earned > 0').toBeGreaterThan(0)

    // Backend invariant: today_xp now reflects the submission.
    const summary = await api.get('/progress/user/me/summary')
    const summaryBody = (await summary.json()) as { today_xp: number }
    expect(summaryBody.today_xp, 'today_xp reflects submission').toBeGreaterThanOrEqual(
      submitBody.xp_earned,
    )
  })
})
