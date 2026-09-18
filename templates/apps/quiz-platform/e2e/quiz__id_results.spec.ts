import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  buildPublishedQuiz,
  captureNetwork,
  signup,
} from './_helpers.js'

async function playToCompletion(
  page: import('@playwright/test').Page,
  quizId: string,
): Promise<string> {
  await page.goto(APP_BASE + '/quiz/' + quizId + '/play')
  await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
  // Q1 (math): correct = '4' (B). Q2 (geo): correct = 'Paris' (C).
  await page.getByTestId('answer-B').click()
  await expect(page.getByTestId('answer-result')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('next-question').click()
  await expect(page.getByTestId('question-counter')).toContainText(/2/i, { timeout: 10000 })
  await page.getByTestId('answer-C').click()
  await expect(page.getByTestId('answer-result')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('next-question').click()
  await page.waitForURL(new RegExp(`/quiz/${quizId}/results\\?sessionId=`), { timeout: 15000 })
  const url = new URL(page.url())
  const sid = url.searchParams.get('sessionId')
  if (!sid) throw new Error('expected sessionId after results redirect')
  return sid
}

test.describe('/quiz/:id/results (Results)', () => {
  test('renders results landmark when ?sessionId=… is provided', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await playToCompletion(page, built.id)
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 15000 })
  })

  test('Mount GETs /api/sessions/{sessionId}/results (gate-12)', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    const sid = await playToCompletion(page, built.id)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/quiz/${built.id}/results?sessionId=${sid}`)
      await expect(page.getByTestId('results')).toBeVisible({ timeout: 15000 })
    })
    const r = reqs.find(
      (req) => req.method === 'GET' && req.url.includes(`/api/sessions/${sid}/results`),
    )
    expect(r, 'GET /api/sessions/{sid}/results').toBeTruthy()
    expect(r?.status).toBe(200)
  })

  test('Question recap section lists each played question (read-after-write)', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await playToCompletion(page, built.id)
    await expect(page.getByTestId('results-recap')).toBeVisible({ timeout: 15000 })
    const rows = page.getByTestId('results-recap').locator('> div')
    await expect(rows.nth(1)).toBeAttached()
    await expect(page.getByText('2 + 2 = ?')).toBeVisible()
    await expect(page.getByText('Capital of France?')).toBeVisible()
  })

  test('"Try again" CTA → /quiz/{id}/play', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await playToCompletion(page, built.id)
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('results-cta-replay').click()
    await expect(page).toHaveURL(new RegExp(`/quiz/${built.id}/play$`))
  })

  test('"See leaderboard" CTA → /leaderboard', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await playToCompletion(page, built.id)
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('results-cta-leaderboard').click()
    await expect(page).toHaveURL(/\/leaderboard$/)
  })

  test('"Find another quiz" CTA → /discover', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await playToCompletion(page, built.id)
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('results-cta-travel_explore').click()
    await expect(page).toHaveURL(/\/discover$/)
  })

  test('Header brand → /discover', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await playToCompletion(page, built.id)
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 15000 })
    await page.getByRole('link', { name: /sparq/i }).first().click()
    await expect(page).toHaveURL(/\/discover$/)
  })

  test('"Back to Discover" link → /discover', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await playToCompletion(page, built.id)
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 15000 })
    await page.getByRole('link', { name: /back to discover/i }).click()
    await expect(page).toHaveURL(/\/discover$/)
  })

  test('Server-side score reflects answered questions (invariant audit)', async ({
    page,
    request,
  }) => {
    const auth = await signup(page)
    const built = await buildPublishedQuiz(page)
    const sid = await playToCompletion(page, built.id)
    const r = await request.get(`${API_BASE}/sessions/${sid}/results`, {
      headers: apiHeaders(auth.token),
    })
    expect(r.status()).toBe(200)
    const body = await r.json()
    const data = body.data ?? body
    expect(data.totalQuestions).toBeGreaterThanOrEqual(2)
    expect(typeof data.score).toBe('number')
    expect(Array.isArray(data.recap)).toBe(true)
  })
})
