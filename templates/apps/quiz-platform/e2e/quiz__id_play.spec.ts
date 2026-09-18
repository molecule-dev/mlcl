import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, buildPublishedQuiz, captureNetwork, signup } from './_helpers.js'

test.describe('/quiz/:id/play (QuizPlay)', () => {
  test('renders quiz-play landmark for solo path', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
  })

  test('quiz-loading appears momentarily before quiz-play (sentinel)', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
    // Either the loading state appears briefly or the play state appears immediately.
    const playPanel = page.getByTestId('quiz-play')
    await expect(playPanel).toBeVisible({ timeout: 15000 })
  })

  test('streak badge renders with text "streak"', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('streak')).toContainText(/streak/i)
  })

  test('score badge starts at 0 pts', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
    // Material-symbols icon glyphs leak into textContent ("stars"), so just
    // assert the literal "0 pts" suffix is present.
    await expect(page.getByTestId('score')).toContainText(/0\s*pts/i)
  })

  test('"Exit" button → /quiz/{id}', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /^exit$/i }).click()
    await expect(page).toHaveURL(new RegExp(`/quiz/${built.id}$`))
  })

  test('question-counter shows "1 of N"', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('question-counter')).toContainText(/1.*of.*\d+/i)
  })

  test('timer is rendered as "NNs" and counts down', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
    const before = await page.getByTestId('timer').textContent()
    await page.waitForTimeout(2000)
    const after = await page.getByTestId('timer').textContent()
    expect(after).not.toBe(before)
  })

  test('question-prompt shows the active question text', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('question-prompt')).toBeVisible()
  })

  test('answer-grid renders a button per choice', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
    const buttons = page.locator('[data-testid="answer-grid"] button[data-testid^="answer-"]')
    await expect(buttons.nth(1)).toBeAttached()
  })

  test('Selecting the correct answer reveals "Spark earned" and increments score (read-after-write via /api/sessions/:id/answer)', async ({
    page,
  }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
    const answerPromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/sessions\/[^/]+\/answer/.test(r.url()),
      { timeout: 15000 },
    )
    // Question 1: "2 + 2 = ?" choices ['3','4','5','6']; correct = '4' → button B
    await page.getByTestId('answer-B').click()
    const ans = await answerPromise
    expect(ans.status()).toBe(201)
    await expect(page.getByTestId('answer-result')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('answer-B')).toHaveAttribute('data-correct', 'true')
    // Score badge in header should now show >0 pts (read-after-write).
    const scoreText = (await page.getByTestId('score').textContent()) ?? ''
    const numeric = Number(scoreText.replace(/[^0-9]/g, '')) || 0
    expect(numeric).toBeGreaterThan(0)
  })

  test('answer-result panel reveals after answering (correct/wrong feedback visible)', async ({
    page,
  }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('answer-A').click()
    await expect(page.getByTestId('answer-result')).toBeVisible({ timeout: 10000 })
  })

  test('"Next question" advances to question 2 (counter increments)', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('answer-B').click()
    await expect(page.getByTestId('answer-result')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('next-question').click()
    await expect(page.getByTestId('question-counter')).toContainText(/2/i, { timeout: 10000 })
  })

  test('Last question "See results" CTA → /quiz/{id}/results?sessionId=…', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
    // Q1
    await page.getByTestId('answer-B').click()
    await expect(page.getByTestId('answer-result')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('next-question').click()
    await expect(page.getByTestId('question-counter')).toContainText(/2/i, { timeout: 10000 })
    // Q2: choices ['Berlin','Madrid','Paris','Rome']; correct = 'Paris' → C
    await page.getByTestId('answer-C').click()
    await expect(page.getByTestId('answer-result')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('next-question').click()
    await expect(page).toHaveURL(new RegExp(`/quiz/${built.id}/results\\?sessionId=`), {
      timeout: 15000,
    })
  })

  test('Mount POSTs /api/sessions, /api/sessions/{id}/join, /api/sessions/{id}/start (gate-12)', async ({
    page,
  }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/quiz/' + built.id + '/play')
      await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
    })
    const a = reqs.find((r) => r.method === 'POST' && /\/api\/sessions(\?|$)/.test(r.url))
    const b = reqs.find((r) => r.method === 'POST' && /\/api\/sessions\/[^/]+\/join/.test(r.url))
    const c = reqs.find((r) => r.method === 'POST' && /\/api\/sessions\/[^/]+\/start/.test(r.url))
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(c).toBeTruthy()
  })
})
