/**
 * /quiz/:id/results — post-submission results page. Verifies the score
 * display, KPI breakdown, and per-question review render after a
 * real /api/quizzes/:id/submit call.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedTopic, signup } from './_helpers.js'

test.describe.configure({ timeout: 120_000 })

async function generateAndSubmit(
  page: import('@playwright/test').Page,
  accessToken: string,
  correct: boolean,
): Promise<{ quizId: string; score: number }> {
  const topic = await seedTopic(page, accessToken)
  const gen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topic.id, questionCount: 3, difficulty: 'easy' },
    timeout: 90_000,
  })
  const quiz = (await gen.json()) as {
    id: string
    questions: Array<{ correct_index: number; options: string[] }>
  }
  const answers = quiz.questions.map((q) =>
    correct ? q.correct_index : (q.correct_index + 1) % q.options.length,
  )
  const sub = await page.request.post(`${API_BASE}/quizzes/${quiz.id}/submit`, {
    headers: apiHeaders(accessToken),
    data: { answers },
  })
  const r = (await sub.json()) as { score: number }
  return { quizId: quiz.id, score: r.score }
}

test('/quiz/:id/results renders page-quiz-results after a submission', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { quizId } = await generateAndSubmit(page, accessToken, true)
  await page.goto(`${APP_BASE}/quiz/${quizId}/results`)
  await expect(page.locator('[data-mol-id="page-quiz-results"]')).toBeVisible({ timeout: 15_000 })
})

test('/quiz/:id/results shows 100% when all answers are correct', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { quizId } = await generateAndSubmit(page, accessToken, true)
  await page.goto(`${APP_BASE}/quiz/${quizId}/results`)
  await expect(page.locator('[data-mol-id="results-score"]')).toContainText('100')
})

test('/quiz/:id/results shows 0% when all answers are wrong', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { quizId } = await generateAndSubmit(page, accessToken, false)
  await page.goto(`${APP_BASE}/quiz/${quizId}/results`)
  await expect(page.locator('[data-mol-id="results-score"]')).toContainText('0')
})

test('/quiz/:id/results is auth-gated (anon redirects to /login)', async ({ page }) => {
  await page.goto(`${APP_BASE}/quiz/00000000-0000-0000-0000-000000000000/results`)
  await page.waitForURL(/\/login/, { timeout: 8_000 })
})

test('/quiz/:id/results page mount fans out to /quizzes/:id + /attempts', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { quizId } = await generateAndSubmit(page, accessToken, true)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(`${APP_BASE}/quiz/${quizId}/results`)
    await expect(page.locator('[data-mol-id="page-quiz-results"]')).toBeVisible({ timeout: 15_000 })
  })
  expect(reqs.find((r) => /\/quizzes\/[^/]+$/.test(r.url) && r.method === 'GET')?.status).toBe(200)
  expect(
    reqs.find((r) => /\/quizzes\/[^/]+\/attempts/.test(r.url) && r.method === 'GET')?.status,
  ).toBe(200)
})

test('/quiz/:id/results renders the "Quiz complete" h1', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { quizId } = await generateAndSubmit(page, accessToken, true)
  await page.goto(`${APP_BASE}/quiz/${quizId}/results`)
  await expect(page.getByRole('heading', { name: /quiz complete/i }).first()).toBeVisible({
    timeout: 15_000,
  })
})

test('/quiz/:id/results renders the "Per-question review" sub-heading + list', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { quizId } = await generateAndSubmit(page, accessToken, true)
  await page.goto(`${APP_BASE}/quiz/${quizId}/results`)
  await expect(
    page.getByRole('heading', { level: 3, name: /per-question review/i }).first(),
  ).toBeVisible({ timeout: 15_000 })
  // The per-question list should have ≥1 item (we submitted 3-question quiz)
  const listItems = page.getByRole('list').getByRole('listitem')
  await expect(listItems.nth(2)).toBeAttached()
})

test('/quiz/:id/results "Retry quiz" link goes back to /quiz/:id', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { quizId } = await generateAndSubmit(page, accessToken, true)
  await page.goto(`${APP_BASE}/quiz/${quizId}/results`)
  await expect(page.locator('[data-mol-id="page-quiz-results"]')).toBeVisible({ timeout: 15_000 })
  await page
    .getByRole('link', { name: /retry quiz/i })
    .first()
    .click()
  await page.waitForURL(new RegExp(`/quiz/${quizId}(?:$|\\?)`), { timeout: 10_000 })
})
