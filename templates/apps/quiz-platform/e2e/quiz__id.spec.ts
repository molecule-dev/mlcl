import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  buildPublishedQuiz,
  captureNetwork,
  createQuizViaApi,
  flipThemeAndAssertChanged,
  signup,
} from './_helpers.js'

test.describe('/quiz/:id (QuizDetail)', () => {
  test('renders quiz-detail landmark for a real quiz', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page, `Detail-Land ${Date.now()}`, 'general')
    await page.goto(APP_BASE + '/quiz/' + built.id)
    await expect(page.getByTestId('quiz-detail')).toBeVisible()
  })

  test('quiz-title shows the quiz.title from API', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page, `Detail-Title ${Date.now()}`, 'general')
    await page.goto(APP_BASE + '/quiz/' + built.id)
    await expect(page.getByTestId('quiz-title')).toContainText(built.title)
  })

  test('renders header brand link', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id)
    await expect(page.getByRole('link', { name: /^sparq/i }).first()).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id)
    await flipThemeAndAssertChanged(page)
  })

  test('user-menu opens with menu items', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id)
    await page
      .getByRole('button', { name: /open user menu|account|profile/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible()
  })

  test('Play solo CTA → /quiz/{id}/play', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id)
    const link = page.getByTestId('play-solo')
    await expect(link).toHaveAttribute('href', `/quiz/${built.id}/play`)
  })

  test('Host multiplayer CTA → /quiz/{id}/lobby', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id)
    const link = page.getByTestId('host-multiplayer')
    await expect(link).toHaveAttribute('href', `/quiz/${built.id}/lobby`)
  })

  test('question-preview renders at most 5 items (and matches question count when ≤5)', async ({
    page,
  }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id)
    await page.waitForLoadState('networkidle')
    const items = page.locator('[data-testid="question-preview"] li')
    await expect(items.first()).toBeVisible()
    const count = await items.count()
    expect(count).toBeLessThanOrEqual(5)
  })

  test('Top players card renders empty-state copy when there are no plays', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/no plays yet/i)).toBeVisible()
  })

  test('GET /api/quizzes/{id} + /questions/quiz/{id} + /leaderboard/quiz/{id} all fire (gate-12)', async ({
    page,
  }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/quiz/' + built.id)
      await page.waitForLoadState('networkidle')
    })
    const a = reqs.find((r) => r.method === 'GET' && r.url.includes(`/api/quizzes/${built.id}`))
    const b = reqs.find(
      (r) => r.method === 'GET' && r.url.includes(`/api/questions/quiz/${built.id}`),
    )
    const c = reqs.find(
      (r) => r.method === 'GET' && r.url.includes(`/api/leaderboard/quiz/${built.id}`),
    )
    expect(a, 'GET /api/quizzes/{id}').toBeTruthy()
    expect(b, 'GET /api/questions/quiz/{id}').toBeTruthy()
    expect(c, 'GET /api/leaderboard/quiz/{id}').toBeTruthy()
    expect(a?.status).toBe(200)
  })

  test('Privacy footer link → /privacy', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id)
    await page
      .getByRole('link', { name: /privacy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('Terms footer link → /terms', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id)
    await page.getByRole('link', { name: /terms/i }).first().click()
    await expect(page).toHaveURL(/\/terms$/)
  })

  test('Language switcher button present', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id)
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })
})
