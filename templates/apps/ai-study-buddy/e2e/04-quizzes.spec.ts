/**
 * Quizzes — AI-generated questions, submission, mastery rollup.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, seedTopic, signup } from './_helpers.js'

test.describe.configure({ timeout: 120_000 })

test('POST /quizzes/generate returns real AI-generated questions', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, {
    title: 'Cell biology',
    description: 'Cell structure and function',
  })

  const res = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topic.id, questionCount: 3, difficulty: 'easy' },
    failOnStatusCode: false,
    timeout: 90_000,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as {
    id: string
    title: string
    question_count: number
    questions: Array<{ question: string; options: string[]; correct_index: number }>
  }
  expect(body.questions.length).toBeGreaterThanOrEqual(2)
  for (const q of body.questions) {
    expect(q.question.length).toBeGreaterThan(5)
    expect(Array.isArray(q.options)).toBe(true)
    expect(q.options.length).toBeGreaterThanOrEqual(3)
    expect(q.correct_index).toBeGreaterThanOrEqual(0)
    expect(q.correct_index).toBeLessThan(q.options.length)
  }
  expect(body.question_count).toBeGreaterThanOrEqual(2)
})

test('POST /quizzes/:id/submit scores correctly and records attempt', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Algebra basics' })

  const gen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topic.id, questionCount: 3, difficulty: 'easy' },
    timeout: 90_000,
  })
  const quiz = (await gen.json()) as {
    id: string
    questions: Array<{ correct_index: number }>
  }

  const correctAnswers = quiz.questions.map((q) => q.correct_index)
  const submit = await page.request.post(`${API_BASE}/quizzes/${quiz.id}/submit`, {
    headers: apiHeaders(accessToken),
    data: { answers: correctAnswers },
    failOnStatusCode: false,
  })
  expect(submit.status(), await submit.text()).toBe(200)
  const result = (await submit.json()) as {
    score: number
    correct_count: number
    total_count: number
  }
  expect(result.score).toBe(100)
  expect(result.correct_count).toBe(quiz.questions.length)

  const attempts = await page.request.get(`${API_BASE}/quizzes/${quiz.id}/attempts`, {
    headers: apiHeaders(accessToken),
  })
  const list = (await attempts.json()) as unknown[]
  expect(list.length).toBe(1)
})

test('POST /quizzes/:id/submit with all wrong answers scores 0 and reports mistakes', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
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
  const wrong = quiz.questions.map((q) => (q.correct_index + 1) % q.options.length)
  const res = await page.request.post(`${API_BASE}/quizzes/${quiz.id}/submit`, {
    headers: apiHeaders(accessToken),
    data: { answers: wrong },
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as { score: number; correct_count: number }
  expect(body.score).toBe(0)
  expect(body.correct_count).toBe(0)
})

test('Quiz submission updates topic mastery_score', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Mastery test topic' })

  const before = (await (
    await page.request.get(`${API_BASE}/topics/${topic.id}`, { headers: apiHeaders(accessToken) })
  ).json()) as { mastery_score: number }
  expect(Number(before.mastery_score)).toBe(0)

  const gen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topic.id, questionCount: 3 },
    timeout: 90_000,
  })
  const quiz = (await gen.json()) as { id: string; questions: Array<{ correct_index: number }> }
  await page.request.post(`${API_BASE}/quizzes/${quiz.id}/submit`, {
    headers: apiHeaders(accessToken),
    data: { answers: quiz.questions.map((q) => q.correct_index) },
  })

  const after = (await (
    await page.request.get(`${API_BASE}/topics/${topic.id}`, { headers: apiHeaders(accessToken) })
  ).json()) as { mastery_score: number }
  expect(Number(after.mastery_score)).toBe(100)
})

test('/quiz/:id renders quiz title and Q1/N progress', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Photosynthesis 101' })
  const gen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topic.id, questionCount: 3, difficulty: 'easy' },
    timeout: 90_000,
  })
  const quiz = (await gen.json()) as { id: string }
  await page.goto(`${APP_BASE}/quiz/${quiz.id}`)
  await expect(page.locator('[data-mol-id="page-quiz"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/question/i).first()).toBeVisible()
})

test('/quiz/:id/results renders the score after submission', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken)
  const gen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topic.id, questionCount: 3, difficulty: 'easy' },
    timeout: 90_000,
  })
  const quiz = (await gen.json()) as { id: string; questions: Array<{ correct_index: number }> }
  await page.request.post(`${API_BASE}/quizzes/${quiz.id}/submit`, {
    headers: apiHeaders(accessToken),
    data: { answers: quiz.questions.map((q) => q.correct_index) },
  })

  await page.goto(`${APP_BASE}/quiz/${quiz.id}/results`)
  await expect(page.locator('[data-mol-id="page-quiz-results"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-mol-id="results-score"]')).toContainText('100')
})

test('GET /quizzes lists quizzes for owner only', async ({ page, browser }) => {
  const ownerCtx = await browser.newContext()
  const ownerPage = await ownerCtx.newPage()
  const owner = await signup(ownerPage)
  const topic = await seedTopic(ownerPage, owner.accessToken)
  await ownerPage.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(owner.accessToken),
    data: { topicId: topic.id, questionCount: 3 },
    timeout: 90_000,
  })

  const otherCtx = await browser.newContext()
  const otherPage = await otherCtx.newPage()
  const other = await signup(otherPage)
  const otherList = await otherPage.request.get(`${API_BASE}/quizzes`, {
    headers: apiHeaders(other.accessToken),
  })
  expect(otherList.status()).toBe(200)
  const otherRows = (await otherList.json()) as unknown[]
  expect(otherRows.length).toBe(0)

  await ownerCtx.close()
  await otherCtx.close()
})
