/**
 * /quiz/:id — multiple-choice quiz player. Verifies the page renders
 * the quiz title, paginates between questions, and submits answers
 * via /api/quizzes/:id/submit.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedTopic, signup } from './_helpers.js'

test.describe.configure({ timeout: 120_000 })

test('/quiz/:id renders page-quiz container with auth', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Chemistry 101' })
  const gen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topic.id, questionCount: 3, difficulty: 'easy' },
    timeout: 90_000,
  })
  const quiz = (await gen.json()) as { id: string }
  const reqs = await captureNetwork(page, async () => {
    const quizFetch = page.waitForResponse(
      (r) => /\/api\/quizzes\/[^/]+(\?|$)/.test(r.url()) && r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    await page.goto(`${APP_BASE}/quiz/${quiz.id}`)
    await quizFetch
    await expect(page.locator('[data-mol-id="page-quiz"]')).toBeVisible({ timeout: 15_000 })
  })
  // observation says page-mount fires GET /api/quizzes/:id
  expect(reqs.find((r) => /\/api\/quizzes\//.test(r.url) && r.method === 'GET')?.status).toBe(200)
})

test('/quiz/:id renders the first question and 4 option buttons', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken)
  const gen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topic.id, questionCount: 3, difficulty: 'easy' },
    timeout: 90_000,
  })
  const quiz = (await gen.json()) as { id: string }
  await page.goto(`${APP_BASE}/quiz/${quiz.id}`)
  await expect(page.locator('[data-mol-id="quiz-option-0"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-mol-id="quiz-option-1"]')).toBeVisible()
})

test('/quiz/:id selecting an option enables Next', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken)
  const gen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topic.id, questionCount: 3, difficulty: 'easy' },
    timeout: 90_000,
  })
  const quiz = (await gen.json()) as { id: string }
  await page.goto(`${APP_BASE}/quiz/${quiz.id}`)
  await expect(page.locator('[data-mol-id="quiz-option-0"]')).toBeVisible({ timeout: 15_000 })
  await page.locator('[data-mol-id="quiz-option-0"]').click()
  await expect(page.locator('[data-mol-id="quiz-next"]')).toBeEnabled()
})

test('/quiz/:id is auth-gated (anon redirects to /login)', async ({ page }) => {
  await page.goto(`${APP_BASE}/quiz/00000000-0000-0000-0000-000000000000`)
  await page.waitForURL(/\/login/, { timeout: 8_000 })
})

test('/quiz/:id renders the quiz title as h1 from /api/quizzes/:id', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Photosynthesis' })
  const gen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topic.id, questionCount: 3, difficulty: 'easy' },
    timeout: 90_000,
  })
  const quiz = (await gen.json()) as { id: string; title: string }
  // Wait for the GET /api/quizzes/:id to complete so the title is populated
  // before reading the heading; otherwise we'd see the "Practice quiz"
  // fallback that renders before the response arrives.
  const quizFetch = page.waitForResponse(
    (r) => /\/api\/quizzes\/[^/]+(\?|$)/.test(r.url()) && r.request().method() === 'GET',
    { timeout: 15_000 },
  )
  await page.goto(`${APP_BASE}/quiz/${quiz.id}`)
  await quizFetch
  await expect
    .poll(
      async () => (await page.getByRole('heading', { level: 1 }).first().innerText()).toLowerCase(),
      { timeout: 5_000 },
    )
    .not.toBe('practice quiz')
  const h1 = await page.getByRole('heading', { level: 1 }).first().innerText()
  expect(h1.length).toBeGreaterThan(0)
  expect(h1.toLowerCase()).not.toBe('practice quiz')
})

test('/quiz/:id Previous button is disabled on Q1, enabled after advancing', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken)
  const gen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topic.id, questionCount: 3, difficulty: 'easy' },
    timeout: 90_000,
  })
  const quiz = (await gen.json()) as { id: string }
  await page.goto(`${APP_BASE}/quiz/${quiz.id}`)
  await expect(page.locator('[data-mol-id="quiz-option-0"]')).toBeVisible({ timeout: 15_000 })
  const prev = page.getByRole('button', { name: /previous/i }).first()
  await expect(prev).toBeDisabled()
  // pick option, advance to Q2
  await page.locator('[data-mol-id="quiz-option-0"]').click()
  await page.locator('[data-mol-id="quiz-next"]').click()
  await expect(prev).toBeEnabled()
})

test('/quiz/:id submitting answers POSTs /quizzes/:id/submit and routes to /results', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken)
  // questionCount has min=3 enforced by the validation schema
  const gen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topic.id, questionCount: 3, difficulty: 'easy' },
    timeout: 90_000,
  })
  expect(gen.status(), await gen.text()).toBeLessThan(300)
  const quiz = (await gen.json()) as {
    id: string
    questions: Array<{ correct_index: number; options: string[] }>
  }
  await page.goto(`${APP_BASE}/quiz/${quiz.id}`)
  await expect(page.locator('[data-mol-id="quiz-option-0"]')).toBeVisible({ timeout: 15_000 })
  // Walk every question, picking the correct option each time.
  for (let i = 0; i < quiz.questions.length; i++) {
    await page.locator(`[data-mol-id="quiz-option-${quiz.questions[i].correct_index}"]`).click()
    if (i < quiz.questions.length - 1) {
      await page.locator('[data-mol-id="quiz-next"]').click()
    }
  }
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="quiz-submit"]').click()
    await page.waitForURL(/\/quiz\/.+\/results/, { timeout: 30_000 })
  })
  const sub = reqs.find((r) => /\/quizzes\/.+\/submit/.test(r.url) && r.method === 'POST')
  expect(sub?.status).toBe(200)
})

test('/quiz/:id "End quiz" link navigates to /courses', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken)
  const gen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topic.id, questionCount: 3, difficulty: 'easy' },
    timeout: 90_000,
  })
  const quiz = (await gen.json()) as { id: string }
  await page.goto(`${APP_BASE}/quiz/${quiz.id}`)
  await expect(page.locator('[data-mol-id="page-quiz"]')).toBeVisible({ timeout: 15_000 })
  await page
    .getByRole('link', { name: /end quiz/i })
    .first()
    .click()
  await page.waitForURL(/\/courses(?:$|\?)/, { timeout: 10_000 })
})
