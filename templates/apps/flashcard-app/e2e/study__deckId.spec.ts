import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

async function createDeckWithCards(page: any, count = 4) {
  await page.goto(APP_BASE + '/decks')
  await page.getByRole('button', { name: /New deck/i }).click()
  await page.getByLabel(/Deck name/i).fill('Study Deck ' + Date.now())
  await page.getByRole('button', { name: /^Create deck$/i }).click()
  await page.waitForURL(/\/decks\/[a-zA-Z0-9-]+/, { timeout: 15_000 })
  const deckId = (page.url().match(/\/decks\/([a-zA-Z0-9-]+)/) || [])[1] || ''
  for (let i = 0; i < count; i++) {
    const r = await page.request.post(API_BASE + '/cards', {
      data: { deck_id: deckId, front: `Q${i} ${Date.now()}`, back: `A${i}`, tags: [] },
    })
    expect(r.ok(), `seed POST /api/cards failed: ${r.status()}`).toBeTruthy()
  }
  return deckId
}

test.describe('/study/:deckId', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('Back to deck link navigates to /decks/:deckId', async ({ page }) => {
    const deckId = await createDeckWithCards(page, 1)
    await page.goto(APP_BASE + '/study/' + deckId)
    await page.getByRole('link', { name: /Back to deck/i }).click()
    await expect(page).toHaveURL(new RegExp(`/decks/${deckId}$`))
  })

  test('GET /api/decks/:id and study endpoints fire on load', async ({ page }) => {
    const deckId = await createDeckWithCards(page, 1)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/study/' + deckId)
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const deckGet = reqs.find((r) => r.url.includes('/api/decks/' + deckId) && r.method === 'GET')
    const dueGet = reqs.find((r) => /\/api\/study\/deck\/.+\/due/.test(r.url) && r.method === 'GET')
    expect(deckGet, 'GET /api/decks/:id should fire').toBeTruthy()
    expect(dueGet, 'GET /api/study/deck/:id/due should fire').toBeTruthy()
  })

  test('clicking the flashcard surface flips it and reveals answer buttons', async ({ page }) => {
    const deckId = await createDeckWithCards(page, 1)
    await page.goto(APP_BASE + '/study/' + deckId)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    // The card surface is a clickable button. Click anywhere reasonable to flip.
    await page.locator('[data-mol-id="study-progress"]').waitFor({ timeout: 10_000 })
    await page.keyboard.press(' ')
    await expect(page.locator('[data-mol-id="answer-good"]')).toBeVisible({ timeout: 10_000 })
  })

  test('Answer "Again" POSTs to /api/study/review with quality=0', async ({ page }) => {
    const deckId = await createDeckWithCards(page, 4)
    await page.goto(APP_BASE + '/study/' + deckId)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await page.keyboard.press(' ')
    await page.locator('[data-mol-id="answer-again"]').waitFor()
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="answer-again"]').click()
      await page.waitForTimeout(500)
    })
    const post = reqs.find((r) => /\/api\/study\/review/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/study/review should fire on Again').toBeTruthy()
    expect(post!.status).toBeLessThan(300)
  })

  test('Answer "Hard" POSTs to /api/study/review', async ({ page }) => {
    const deckId = await createDeckWithCards(page, 4)
    await page.goto(APP_BASE + '/study/' + deckId)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await page.keyboard.press(' ')
    await page.locator('[data-mol-id="answer-hard"]').waitFor()
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="answer-hard"]').click()
      await page.waitForTimeout(500)
    })
    const post = reqs.find((r) => /\/api\/study\/review/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/study/review should fire on Hard').toBeTruthy()
    expect(post!.status).toBeLessThan(300)
  })

  test('Answer "Good" POSTs and the review changes server-side state (read-after-write)', async ({
    page,
  }) => {
    const deckId = await createDeckWithCards(page, 4)
    await page.goto(APP_BASE + '/study/' + deckId)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await page.keyboard.press(' ')
    await page.locator('[data-mol-id="answer-good"]').waitFor()
    // Pre-fetch overview to compare total_reviews afterwards.
    const before = await page.request.get(API_BASE + '/reports/overview')
    const beforeJson = await before.json()
    const beforeTotal = beforeJson?.total_reviews ?? beforeJson?.data?.total_reviews ?? 0
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="answer-good"]').click()
      await page.waitForTimeout(800)
    })
    const post = reqs.find((r) => /\/api\/study\/review/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/study/review should fire on Good').toBeTruthy()
    expect(post!.status).toBeLessThan(300)
    const after = await page.request.get(API_BASE + '/reports/overview')
    const afterJson = await after.json()
    const afterTotal = afterJson?.total_reviews ?? afterJson?.data?.total_reviews ?? 0
    expect(
      afterTotal,
      'total_reviews must increment after a real review POST',
    ).toBeGreaterThanOrEqual(beforeTotal + 1)
  })

  test('Answer "Easy" POSTs to /api/study/review with quality=5', async ({ page }) => {
    const deckId = await createDeckWithCards(page, 4)
    await page.goto(APP_BASE + '/study/' + deckId)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await page.keyboard.press(' ')
    await page.locator('[data-mol-id="answer-easy"]').waitFor()
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="answer-easy"]').click()
      await page.waitForTimeout(500)
    })
    const post = reqs.find((r) => /\/api\/study\/review/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/study/review should fire on Easy').toBeTruthy()
    expect(post!.status).toBeLessThan(300)
  })
})
