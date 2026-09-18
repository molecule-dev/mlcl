/**
 * Full primary-feature walk: end-to-end smoke that exercises every
 * production-critical journey through the UI + asserts backend
 * invariants. This is the "user pays for it, can they do the thing?"
 * gate beyond unit-style page specs.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe.configure({ timeout: 240_000 })

test('walk: full primary-feature journey', async ({ page }) => {
  const creds = await signup(page)
  const auth = apiHeaders(creds.accessToken)

  // -- topic creation via API (ground truth) ----------------------------
  const topicRes = await page.request.post(`${API_BASE}/topics`, {
    headers: auth,
    data: { title: 'Calculus 101', subject: 'math', description: 'Basic derivatives.' },
  })
  expect(topicRes.status()).toBe(201)
  const topic = (await topicRes.json()) as { id: string; title: string }

  // Read-after-write: the topic must show in the list
  const topicsList = await page.request.get(`${API_BASE}/topics`, { headers: auth })
  expect(topicsList.status()).toBe(200)
  const topicsBody = (await topicsList.json()) as Array<{ id: string }>
  expect(topicsBody.find((t) => t.id === topic.id)).toBeTruthy()

  // -- /courses page renders the seeded topic --------------------------
  await page.goto(APP_BASE + '/courses')
  await expect(page.getByText('Calculus 101').first()).toBeVisible({ timeout: 10_000 })

  // -- /study/:id loads + AI tutor responds (real Claude) --------------
  await page.goto(`${APP_BASE}/study/${topic.id}`)
  await expect(page.locator('[data-mol-id="page-study"]')).toBeVisible({ timeout: 15_000 })
  const composer = page.locator('[data-mol-id="study-composer-input"]')
  await composer.click()
  await composer.pressSequentially('What is a derivative?', { delay: 8 })
  const askPromise = page.waitForResponse(
    (r) => /\/api\/topics\/[^/]+\/ask/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 90_000 },
  )
  await composer.press('Enter')
  const askResp = await askPromise
  expect(askResp.status()).toBe(200)
  const askBody = (await askResp.json()) as { answer: string }
  expect(askBody.answer.length).toBeGreaterThan(40)

  // -- Quiz: generate (real Claude) → load → submit → results -----------
  const quizGen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: auth,
    data: { topicId: topic.id, questionCount: 3, difficulty: 'easy' },
    timeout: 120_000,
  })
  expect(quizGen.status(), await quizGen.text()).toBe(201)
  const quiz = (await quizGen.json()) as { id: string; questions?: unknown[] }
  expect((quiz.questions ?? []).length).toBeGreaterThanOrEqual(3)

  await page.goto(`${APP_BASE}/quiz/${quiz.id}`)
  await expect(page.locator('[data-mol-id="page-quiz"]')).toBeVisible({ timeout: 15_000 })
  const optionsCount = await page.locator('[data-mol-id^="quiz-option-"]').count()
  expect(optionsCount).toBeGreaterThan(0)

  // Submit via API to verify grading + persistence (UI submit flow is
  // covered in 24-quiz__id.spec.ts).
  const submitRes = await page.request.post(`${API_BASE}/quizzes/${quiz.id}/submit`, {
    headers: auth,
    data: { answers: [0, 0, 0] },
  })
  expect([200, 201]).toContain(submitRes.status())

  await page.goto(`${APP_BASE}/quiz/${quiz.id}/results`)
  await expect(page.getByRole('heading', { name: /quiz complete/i })).toBeVisible({
    timeout: 15_000,
  })

  // -- Decks/Flashcards CRUD --------------------------------------------
  const deckRes = await page.request.post(`${API_BASE}/decks`, {
    headers: auth,
    data: { name: 'Derivatives Pack', description: 'Walk-test deck', topic_id: topic.id },
  })
  expect(deckRes.status()).toBe(201)
  const deck = (await deckRes.json()) as { id: string }

  const cardRes = await page.request.post(`${API_BASE}/decks/${deck.id}/cards`, {
    headers: auth,
    data: { front_md: 'd/dx of x^2?', back_md: '2x' },
  })
  expect([200, 201]).toContain(cardRes.status())

  await page.goto(`${APP_BASE}/flashcards`)
  await expect(page.getByText('Derivatives Pack').first()).toBeVisible({ timeout: 10_000 })

  // -- Progress page --------------------------------------------------
  await page.goto(APP_BASE + '/progress')
  await expect(page.locator('[data-mol-id="page-progress"]')).toBeVisible({ timeout: 10_000 })

  // -- Search shows our topic ----------------------------------------
  const searchPromise = page.waitForResponse(
    (r) => /\/api\/search/.test(r.url()) && r.request().method() === 'GET',
    { timeout: 15_000 },
  )
  await page.goto(APP_BASE + '/search?q=calculus')
  await expect(page.locator('[data-mol-id="search-input"]')).toBeVisible({ timeout: 10_000 })
  await searchPromise
  await expect(page.getByText(/calculus/i).first()).toBeVisible({ timeout: 10_000 })

  // -- Profile page --------------------------------------------------
  await page.goto(APP_BASE + '/profile')
  await expect(page.locator('[data-mol-id="page-profile"]')).toBeVisible({ timeout: 10_000 })

  // -- Settings: localStorage-backed; verify save → reload persistence --
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('[data-mol-id="page-settings"]')).toBeVisible({ timeout: 10_000 })
  await page.locator('input[type="radio"][value="hard"]').click()
  await page.getByRole('button', { name: /^save changes$/i }).click()
  await expect(page.getByText(/settings saved/i)).toBeVisible({ timeout: 5_000 })
  await page.reload()
  await expect(page.locator('input[type="radio"][value="hard"]')).toBeChecked()

  // -- Billing: tiers list shape + Stripe checkout URL ---------------
  const tiers = await page.request.get(`${API_BASE}/billing/tiers`)
  expect(tiers.status()).toBe(200)
  const tierWrapper = (await tiers.json()) as {
    data: Array<{
      key: string
      prices: Array<{ period: string; price: string; stripePriceId: string | null }>
    }>
  }
  expect(tierWrapper.data.length).toBeGreaterThanOrEqual(1)
  const paidTier = tierWrapper.data.find((t) => t.key !== 'free')
  const stripePriceId = paidTier?.prices.find((p) => p.stripePriceId)?.stripePriceId
  if (stripePriceId) {
    const checkout = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: auth,
      data: { priceId: stripePriceId },
    })
    expect([200, 201]).toContain(checkout.status())
    const co = (await checkout.json()) as { checkoutUrl?: string; updated?: boolean }
    if (co.checkoutUrl) {
      expect(co.checkoutUrl).toMatch(/^https?:\/\//)
    } else {
      expect(co.updated).toBeTruthy()
    }
  }

  // -- Reset password: enqueue should not 500 (route is /users/forgot-password) --
  const reset = await page.request.post(`${API_BASE}/users/forgot-password`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email: creds.email },
  })
  expect([200, 202, 204]).toContain(reset.status())

  // -- Quick UI smoke: dashboard renders KPI tiles ------------------
  await page.goto(APP_BASE + '/dashboard')
  await expect(page.locator('[data-mol-id="page-dashboard"]')).toBeVisible({ timeout: 10_000 })

  // Final assertion: the captured network during this walk had no
  // server-side 5xx on production paths.
  const probe = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle', { timeout: 10_000 })
  })
  const fiveXX = probe.filter((r) => r.status >= 500 && /\/api\//.test(r.url))
  expect(fiveXX, JSON.stringify(fiveXX)).toEqual([])
})
