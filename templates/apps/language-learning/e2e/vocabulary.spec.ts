import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('/vocabulary', () => {
  test('renders vocab cards (seeded for fresh users)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vocabulary')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    // Backend seeds 6 starter words on first /api/progress/user/me/summary
    // hit. The page hits /api/vocabulary on mount, so a fresh signup should
    // see at least one card with our test-id.
    const cards = page.locator('[data-testid="vocab-card"]')
    await cards.first().waitFor({ timeout: 10000 })
    expect(await cards.count(), 'vocab cards rendered').toBeGreaterThan(0)
  })

  test('marking a word "Got it" persists mastery to the backend (read-after-write)', async ({
    page,
    request,
  }) => {
    const { accessToken } = await signup(page)
    // Force a summary call so starter vocab gets seeded.
    const api = authedApi(request, accessToken!)
    await api.get('/progress/user/me/summary')

    const beforeRes = await api.get('/vocabulary')
    const beforeList = (await beforeRes.json()) as Array<{ id: string; mastery: number }>
    expect(beforeList.length, 'has seeded vocabulary').toBeGreaterThan(0)
    const target = beforeList[0]
    const beforeMastery = Number(target.mastery)

    const reviewRes = await api.post(`/vocabulary/${target.id}/review`, { correct: true })
    expect(reviewRes.status(), 'review status').toBe(200)
    const updated = (await reviewRes.json()) as { mastery: number; next_review_iso: string }
    expect(updated.mastery, 'mastery incremented').toBeGreaterThan(beforeMastery)

    // Read back via the public list endpoint to confirm persistence.
    const afterRes = await api.get('/vocabulary')
    const afterList = (await afterRes.json()) as Array<{ id: string; mastery: number }>
    const after = afterList.find((v) => v.id === target.id)
    expect(after, 'word still in list after review').toBeTruthy()
    expect(Number(after!.mastery), 'persisted mastery > before').toBeGreaterThan(beforeMastery)
  })

  test('"Got it" UI button fires the review POST', async ({ page }) => {
    await signup(page)
    // Make sure starter vocab is seeded.
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    await page.goto(APP_BASE + '/vocabulary')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

    const btn = page.locator('[data-testid="vocab-review-gotit"]').first()
    await btn.waitFor({ timeout: 10000 })
    const reqs = await captureNetwork(page, async () => {
      await btn.click()
      await page.waitForTimeout(2000)
    })
    const reviewReqs = whereUrl(reqs, /\/api\/vocabulary\/[^/]+\/review$/, 'POST')
    expect(reviewReqs.length, 'review POST fired').toBeGreaterThan(0)
    expect(reviewReqs[0].status, 'review POST status').toBe(200)
  })
})
