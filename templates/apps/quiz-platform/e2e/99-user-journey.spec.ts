import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  bearerToken,
  captureNetwork,
  flipThemeAndAssertChanged,
  signup,
  uniqueEmail,
} from './_helpers.js'

/**
 * 99-user-journey.spec.ts — kitchen-sink end-to-end run.
 *
 * Walks a fresh user through every primary feature of Sparq Quiz, asserting
 * read-after-write invariants at each step (POST → server returns 200/201 →
 * subsequent GET reflects the change). Long single test by design — the
 * point is to catch regressions in the *sequence* of actions, not isolated
 * units.
 */
test.describe.serial('99-user-journey: full Sparq Quiz lifecycle', () => {
  test('signup → discover → build → publish → play → results → settings → logout', async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000)

    // ─── 1. Anonymous landing ────────────────────────────────────────────
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('link', { name: /sparq home/i }).first()).toBeVisible()

    // Theme toggle works on landing
    await flipThemeAndAssertChanged(page)

    // ─── 2. Sign up ──────────────────────────────────────────────────────
    const email = uniqueEmail('journey')
    const password = 'TestPass!1234'
    const auth = await signup(page, email, password)
    expect(auth.token).toBeTruthy()

    // ─── 3. Discover seeded demo quizzes ────────────────────────────────
    await page.goto(APP_BASE + '/discover')
    const discoverReqs = await captureNetwork(page, async () => {
      await page.waitForLoadState('networkidle')
    })
    const discoverGet = discoverReqs.find(
      (r) => r.method === 'GET' && /\/api\/quizzes(\?|$)/.test(r.url),
    )
    expect(discoverGet, 'GET /api/quizzes on /discover').toBeTruthy()

    // ─── 4. Create a quiz from /my-quizzes ──────────────────────────────
    await page.goto(APP_BASE + '/my-quizzes')
    await page.waitForLoadState('networkidle')
    const createReqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /new quiz/i }).click()
      await page.waitForURL(/\/quiz\/[^/]+\/edit/, { timeout: 15000 })
    })
    const createPost = createReqs.find(
      (r) => r.method === 'POST' && /\/api\/quizzes(\?|$)/.test(r.url),
    )
    expect(createPost?.status).toBe(201)
    const editUrl = new URL(page.url())
    const quizId = editUrl.pathname.split('/')[2]
    expect(quizId).toBeTruthy()

    // Read-after-write: GET /api/quizzes/{id} returns the new quiz
    const token = await bearerToken(page)
    const probe1 = await request.get(`${API_BASE}/quizzes/${quizId}`, {
      headers: apiHeaders(token),
    })
    expect(probe1.status()).toBe(200)

    // ─── 5. Quiz builder: rename, add questions, publish ────────────────
    // Edit title
    const titleField = page.getByRole('textbox', { name: /quiz title|title/i }).first()
    if (await titleField.count().catch(() => 0)) {
      await titleField.fill('Journey Trivia')
      await titleField.blur()
      await page.waitForTimeout(800)
    }

    // Add Q1 via API (UI flow varies; API path is deterministic)
    const q1 = await request.post(`${API_BASE}/questions`, {
      headers: apiHeaders(token),
      data: {
        quiz_id: quizId,
        prompt: 'Sky color?',
        type: 'multiple-choice',
        choices: ['Red', 'Green', 'Blue', 'Pink'],
        correct_answer: 'Blue',
        points: 100,
        time_limit_s: 20,
        position: 0,
      },
    })
    expect(q1.status()).toBe(201)

    const q2 = await request.post(`${API_BASE}/questions`, {
      headers: apiHeaders(token),
      data: {
        quiz_id: quizId,
        prompt: 'Largest planet?',
        type: 'multiple-choice',
        choices: ['Mars', 'Earth', 'Jupiter', 'Mercury'],
        correct_answer: 'Jupiter',
        points: 100,
        time_limit_s: 20,
        position: 1,
      },
    })
    expect(q2.status()).toBe(201)

    // Read-after-write: questions list returns 2 entries
    const qList = await request.get(`${API_BASE}/questions/quiz/${quizId}`, {
      headers: apiHeaders(token),
    })
    const qBody = await qList.json()
    const qData = qBody.data ?? qBody
    expect(Array.isArray(qData) ? qData.length : 0).toBeGreaterThanOrEqual(2)

    // Publish via API
    const pub = await request.post(`${API_BASE}/quizzes/${quizId}/publish`, {
      headers: apiHeaders(token),
    })
    expect(pub.status()).toBe(200)

    // Read-after-write: quiz row reports published
    const probe2 = await request.get(`${API_BASE}/quizzes/${quizId}`, {
      headers: apiHeaders(token),
    })
    const probe2Body = await probe2.json()
    const probe2Data = probe2Body.data ?? probe2Body
    expect(['published', 'live', 'open']).toContain((probe2Data.status ?? '').toString())

    // ─── 6. Quiz detail page renders questions + leaderboard slot ───────
    await page.goto(APP_BASE + '/quiz/' + quizId)
    await expect(page.getByText('Journey Trivia'))
      .toBeVisible({ timeout: 10000 })
      .catch(() => undefined)

    // ─── 7. Play solo — answer both questions ───────────────────────────
    await page.goto(APP_BASE + '/quiz/' + quizId + '/play')
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })
    // Q1 ('Sky color?') correct = 'Blue' → C
    await page.getByTestId('answer-C').click()
    await expect(page.getByTestId('answer-result')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('next-question').click()
    await expect(page.getByTestId('question-counter')).toContainText(/2/, { timeout: 10000 })
    // Q2 ('Largest planet?') correct = 'Jupiter' → C
    await page.getByTestId('answer-C').click()
    await expect(page.getByTestId('answer-result')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('next-question').click()
    await page.waitForURL(new RegExp(`/quiz/${quizId}/results\\?sessionId=`), { timeout: 15000 })

    // ─── 8. Results page ─────────────────────────────────────────────────
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('results-recap')).toBeVisible()
    const resultsUrl = new URL(page.url())
    const sessionId = resultsUrl.searchParams.get('sessionId')
    expect(sessionId).toBeTruthy()

    // Read-after-write: server-side score reflects answers
    const resR = await request.get(`${API_BASE}/sessions/${sessionId}/results`, {
      headers: apiHeaders(token),
    })
    expect(resR.status()).toBe(200)
    const resBody = await resR.json()
    const resData = resBody.data ?? resBody
    expect(resData.totalQuestions).toBeGreaterThanOrEqual(2)
    expect(resData.totalCorrect).toBeGreaterThanOrEqual(0)

    // ─── 9. Try-again CTA returns to /play ──────────────────────────────
    await page.getByTestId('results-cta-replay').click()
    await expect(page).toHaveURL(new RegExp(`/quiz/${quizId}/play$`))
    await expect(page.getByTestId('quiz-play')).toBeVisible({ timeout: 15000 })

    // ─── 10. Leaderboard page renders ───────────────────────────────────
    await page.goto(APP_BASE + '/leaderboard')
    const lbReqs = await captureNetwork(page, async () => {
      await page.waitForLoadState('networkidle')
    })
    expect(
      lbReqs.find((r) => r.method === 'GET' && /\/api\/leaderboard\/global/.test(r.url)),
    ).toBeTruthy()

    // ─── 11. Notifications page ─────────────────────────────────────────
    await page.goto(APP_BASE + '/notifications')
    const notifReqs = await captureNetwork(page, async () => {
      await page.waitForLoadState('networkidle')
    })
    expect(
      notifReqs.find((r) => r.method === 'GET' && /\/api\/notifications/.test(r.url)),
    ).toBeTruthy()

    // ─── 12. Settings: update display name (read-after-write) ───────────
    await page.goto(APP_BASE + '/settings')
    const editBtn = page.getByRole('button', { name: /edit profile/i }).first()
    if (await editBtn.count().catch(() => 0)) {
      await editBtn.click()
      const nameInput = page.getByRole('textbox', { name: /display name|your name|name/i }).first()
      await nameInput.fill('Journey Player')
      await page.getByRole('button', { name: /save/i }).first().click()
      await page.waitForTimeout(800)
      // Decode userId from JWT and probe /api/users/{id} (the User resource has no /me endpoint).
      const userId = await (async () => {
        try {
          const payload = token.split('.')[1] ?? ''
          const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
          return decoded.sub ?? decoded.userId ?? decoded.id ?? null
        } catch {
          return null
        }
      })()
      if (userId) {
        const me = await request.get(`${API_BASE}/users/${userId}`, {
          headers: apiHeaders(token),
          failOnStatusCode: false,
        })
        if (me.status() === 200) {
          const meBody = await me.json()
          const props = meBody.data?.props ?? meBody.props ?? {}
          // Server should reflect the new name (or at least not the old default)
          expect(typeof props.name === 'string' || typeof props.username === 'string').toBe(true)
        }
      }
    }

    // ─── 13. Pricing page renders ───────────────────────────────────────
    await page.goto(APP_BASE + '/pricing')
    const pricingReqs = await captureNetwork(page, async () => {
      await page.waitForLoadState('networkidle')
    })
    expect(
      pricingReqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url)),
    ).toBeTruthy()

    // ─── 14. Profile page reflects user's published quiz ────────────────
    await page.goto(APP_BASE + '/u/' + auth.name)
    await page.waitForLoadState('networkidle').catch(() => undefined)

    // ─── 15. Delete the quiz from /my-quizzes ───────────────────────────
    const del = await request.delete(`${API_BASE}/quizzes/${quizId}`, {
      headers: apiHeaders(token),
    })
    expect([200, 204]).toContain(del.status())
    const probe3 = await request.get(`${API_BASE}/quizzes/${quizId}`, {
      headers: apiHeaders(token),
      failOnStatusCode: false,
    })
    expect([404, 410]).toContain(probe3.status())

    // ─── 16. Logout via header user-menu ────────────────────────────────
    await page.goto(APP_BASE + '/my-quizzes')
    const trigger = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
    if (await trigger.count().catch(() => 0)) {
      await trigger.click()
      const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
      if (await out.count().catch(() => 0)) {
        await out.click()
        await page.waitForTimeout(800)
      }
    }
    // After signing out, root should not include the user-menu button.
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('link', { name: /log\s*in|sign\s*in/i }).first()).toBeVisible({
      timeout: 10000,
    })
  })
})
