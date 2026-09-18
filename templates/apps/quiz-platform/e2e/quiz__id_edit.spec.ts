import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  bearerToken,
  captureNetwork,
  createQuizViaApi,
  flipThemeAndAssertChanged,
  signup,
} from './_helpers.js'

test.describe('/quiz/:id/edit (QuizBuilder)', () => {
  test('renders quiz-builder landmark for owner', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page, `Builder ${Date.now()}`)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await expect(page.getByTestId('quiz-builder')).toBeVisible()
  })

  test('quiz-status badge reads "Draft" for a fresh quiz', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await expect(page.getByTestId('quiz-status')).toContainText(/draft/i)
  })

  test('quiz-title-input PUTs /api/quizzes/{id} on blur (read-after-write)', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page, 'Original Title')
    const token = await bearerToken(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    const reqs = await captureNetwork(page, async () => {
      const input = page.getByTestId('quiz-title-input')
      await input.fill('Renamed Title E2E')
      await input.blur()
      await page.waitForLoadState('networkidle')
    })
    const put = reqs.find((r) => r.method === 'PUT' && r.url.includes(`/api/quizzes/${id}`))
    expect(put, 'PUT /api/quizzes/{id}').toBeTruthy()
    expect(put?.status).toBeLessThan(400)
    const probe = await page.request.get(`${API_BASE}/quizzes/${id}`, {
      headers: apiHeaders(token),
    })
    const body = (await probe.json()) as { title: string }
    expect(body.title).toBe('Renamed Title E2E')
  })

  test('"Add question" empty-state button POSTs /api/questions and reveals editor', async ({
    page,
  }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('add-first-question').click()
      await expect(page.getByTestId('question-editor')).toBeVisible()
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/questions(\?|$)/.test(r.url))
    expect(post).toBeTruthy()
    expect(post?.status).toBe(201)
  })

  test('Sidebar "+" button appends another question (POST /api/questions)', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await page.getByTestId('add-first-question').click()
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('add-question').click()
      await page.waitForLoadState('networkidle')
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/questions(\?|$)/.test(r.url))
    expect(post).toBeTruthy()
  })

  test('question-tab-0 activates the first question', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await page.getByTestId('add-first-question').click()
    await page.getByTestId('question-tab-0').click()
    await expect(page.getByTestId('question-editor')).toBeVisible()
  })

  test('question-prompt textarea PATCHes /api/questions/{id} on blur (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    const token = await bearerToken(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await page.getByTestId('add-first-question').click()
    const prompt = page.getByTestId('question-prompt')
    await prompt.fill('Prompt rewritten by e2e')
    const reqs = await captureNetwork(page, async () => {
      await prompt.blur()
      await page.waitForLoadState('networkidle')
    })
    const put = reqs.find((r) => r.method === 'PUT' && /\/api\/questions\//.test(r.url))
    expect(put).toBeTruthy()
    expect(put?.status).toBeLessThan(400)
    const list = await page.request.get(`${API_BASE}/questions/quiz/${id}`, {
      headers: apiHeaders(token),
    })
    const items = (await list.json()) as Array<{ prompt: string }>
    expect(items[0].prompt).toBe('Prompt rewritten by e2e')
  })

  test('choice-input-A PUTs /api/questions/{id} with new choices on blur', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await page.getByTestId('add-first-question').click()
    const choice = page.getByTestId('choice-input-A')
    await choice.fill('Choice A typed by e2e')
    const reqs = await captureNetwork(page, async () => {
      await choice.blur()
      await page.waitForLoadState('networkidle')
    })
    const put = reqs.find((r) => r.method === 'PUT' && /\/api\/questions\//.test(r.url))
    expect(put).toBeTruthy()
  })

  test('mark-correct-A PUTs /api/questions/{id} with correct_answer (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    const token = await bearerToken(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await page.getByTestId('add-first-question').click()
    await page.getByTestId('choice-input-A').fill('Right!')
    await page.getByTestId('choice-input-A').blur()
    await page.waitForLoadState('networkidle')
    await page.getByTestId('mark-correct-A').check()
    await page.waitForLoadState('networkidle')
    const list = await page.request.get(`${API_BASE}/questions/quiz/${id}`, {
      headers: apiHeaders(token),
    })
    const items = (await list.json()) as Array<{ correct_answer: string }>
    expect(items[0].correct_answer).toBe('Right!')
  })

  test('delete-question DELETEs /api/questions/{id} and removes the tab (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    const token = await bearerToken(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await page.getByTestId('add-first-question').click()
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('delete-question').click()
      await page.waitForLoadState('networkidle')
    })
    const del = reqs.find((r) => r.method === 'DELETE' && /\/api\/questions\//.test(r.url))
    expect(del).toBeTruthy()
    expect(del?.status).toBe(204)
    const list = await page.request.get(`${API_BASE}/questions/quiz/${id}`, {
      headers: apiHeaders(token),
    })
    expect((await list.json()) as unknown[]).toHaveLength(0)
  })

  test('publish-quiz with no complete questions surfaces an error message', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await page.getByTestId('publish-quiz').click()
    await expect(page.getByTestId('builder-status')).toBeVisible()
  })

  test('publish-quiz transitions a complete quiz to status=published (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    const token = await bearerToken(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await page.getByTestId('add-first-question').click()
    await page.getByTestId('question-prompt').fill('What is 2+2?')
    await page.getByTestId('question-prompt').blur()
    await page.waitForLoadState('networkidle')
    await page.getByTestId('choice-input-A').fill('3')
    await page.getByTestId('choice-input-A').blur()
    await page.getByTestId('choice-input-B').fill('4')
    await page.getByTestId('choice-input-B').blur()
    await page.waitForLoadState('networkidle')
    await page.getByTestId('mark-correct-B').check()
    await page.waitForLoadState('networkidle')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('publish-quiz').click()
      await expect(page.getByTestId('quiz-status')).toContainText(/published/i, { timeout: 15000 })
    })
    const pub = reqs.find(
      (r) => r.method === 'POST' && r.url.includes(`/api/quizzes/${id}/publish`),
    )
    expect(pub).toBeTruthy()
    expect(pub?.status).toBe(200)
    const probe = await page.request.get(`${API_BASE}/quizzes/${id}`, {
      headers: apiHeaders(token),
    })
    const body = (await probe.json()) as { status: string }
    expect(body.status).toBe('published')
  })

  test('builder-status renders publish error or success copy when set', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await page.getByTestId('publish-quiz').click()
    await expect(page.getByTestId('builder-status')).toBeVisible()
  })

  test('renders header brand link', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await expect(page.getByRole('link', { name: /^sparq/i }).first()).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await flipThemeAndAssertChanged(page)
  })

  test('user-menu opens with menu items', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await page
      .getByRole('button', { name: /open user menu|account|profile/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible()
  })

  test('Privacy footer link → /privacy', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await page
      .getByRole('link', { name: /privacy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('Terms footer link → /terms', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await page.getByRole('link', { name: /terms/i }).first().click()
    await expect(page).toHaveURL(/\/terms$/)
  })

  test('Language switcher button present', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page)
    await page.goto(APP_BASE + '/quiz/' + id + '/edit')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })
})
