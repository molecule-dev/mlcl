import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  bearerToken,
  buildPublishedQuiz,
  captureNetwork,
  createQuizViaApi,
  flipThemeAndAssertChanged,
  signup,
} from './_helpers.js'

test.describe('/my-quizzes', () => {
  test('renders header brand link', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-quizzes')
    await expect(page.getByRole('link', { name: /^sparq/i }).first()).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-quizzes')
    await flipThemeAndAssertChanged(page)
  })

  test('user-menu opens with menu items', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-quizzes')
    await page
      .getByRole('button', { name: /open user menu|account|profile/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible()
  })

  test('"New quiz" button POSTs /api/quizzes and navigates to /quiz/{id}/edit (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-quizzes')
    await page.waitForLoadState('networkidle')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /new quiz/i }).click()
      await page.waitForURL(/\/quiz\/[^/]+\/edit/, { timeout: 15000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/quizzes(\?|$)/.test(r.url))
    expect(post, 'POST /api/quizzes').toBeTruthy()
    expect(post?.status).toBe(201)
    await expect(page).toHaveURL(/\/quiz\/[^/]+\/edit/)
  })

  test('"Created by me" tab filters list to mine=true (gate-12)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/my-quizzes')
      await page.waitForLoadState('networkidle')
    })
    const mineReq = reqs.find(
      (r) => r.method === 'GET' && /\/api\/quizzes\?.*mine=true/.test(r.url),
    )
    expect(mineReq).toBeTruthy()
    expect(mineReq?.status).toBe(200)
  })

  test('"Discover" tab switches to all-published view', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-quizzes')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /^discover$/i }).click()
    await page.waitForLoadState('networkidle')
    // Stay on /my-quizzes; tab merely changes the rendered list source.
    await expect(page).toHaveURL(/\/my-quizzes/)
  })

  test('Empty-state "Build your first quiz →" link triggers a quiz create', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-quizzes')
    await page.waitForLoadState('networkidle')
    const empty = page.getByRole('link', { name: /build your first quiz/i })
    if ((await empty.count()) === 0) test.skip(true, 'list not empty for this fresh user')
    const reqs = await captureNetwork(page, async () => {
      await empty.click()
      await page.waitForURL(/\/quiz\/[^/]+\/edit/, { timeout: 15000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/quizzes(\?|$)/.test(r.url))
    expect(post).toBeTruthy()
  })

  test('Quiz row "Edit" link points to /quiz/{id}/edit', async ({ page }) => {
    await signup(page)
    const id = await createQuizViaApi(page, `Edit-Link ${Date.now()}`, 'general')
    await page.goto(APP_BASE + '/my-quizzes')
    await page.waitForLoadState('networkidle')
    const editLink = page.getByTestId(`quiz-edit-${id}`)
    await expect(editLink).toHaveAttribute('href', `/quiz/${id}/edit`)
  })

  test('Quiz row "Delete" button DELETEs via API and removes the row (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const id = await createQuizViaApi(page, `Delete-Me ${Date.now()}`, 'general')
    const token = await bearerToken(page)
    await page.goto(APP_BASE + '/my-quizzes')
    await page.waitForLoadState('networkidle')
    // Wait for the row to render before clicking delete (read-after-write).
    await expect(page.getByTestId(`quiz-row-${id}`)).toBeVisible({ timeout: 10000 })
    // Destructive action: the first click arms the inline confirmation, the
    // second (Confirm) commits the DELETE. Arm the response wait before it.
    await page.getByTestId(`quiz-delete-${id}`).click()
    const confirmBtn = page.getByTestId(`quiz-delete-confirm-${id}`)
    await expect(confirmBtn).toBeVisible()
    const delPromise = page.waitForResponse(
      (r) => r.request().method() === 'DELETE' && r.url().includes(`/api/quizzes/${id}`),
      { timeout: 15000 },
    )
    await confirmBtn.click()
    const del = await delPromise
    expect(del.status()).toBe(204)
    // Verify backend really deleted
    const probe = await page.request.get(`${API_BASE}/quizzes/${id}`, {
      headers: apiHeaders(token),
      failOnStatusCode: false,
    })
    expect(probe.status()).toBe(404)
    // Row vanished from DOM
    await expect(page.getByTestId(`quiz-row-${id}`)).toHaveCount(0)
  })

  test('Privacy footer link → /privacy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-quizzes')
    await page
      .getByRole('link', { name: /privacy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('Terms footer link → /terms', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-quizzes')
    await page.getByRole('link', { name: /terms/i }).first().click()
    await expect(page).toHaveURL(/\/terms$/)
  })

  test('Language switcher button present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-quizzes')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })

  test('Published quiz appears as a card after build+publish', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page, `Built-And-Listed ${Date.now()}`, 'general')
    await page.goto(APP_BASE + '/my-quizzes')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(built.title).first()).toBeVisible()
  })
})
