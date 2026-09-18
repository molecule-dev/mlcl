import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

/**
 * Cross-page kitchen-sink user journey. The point of this spec is to
 * exercise multiple flagship surfaces in a single signed-in session and
 * assert real persistence across page boundaries (read-after-write),
 * not per-element minutiae — those live in the per-page specs.
 */
test.describe('user journey — signup → deck → card → study → settings', () => {
  test('full happy path with persistence assertions', async ({ page }) => {
    // 1. Sign up a fresh user; we should land off /signup.
    await signup(page)
    await expect(page).not.toHaveURL(/\/signup/)

    // 2. Dashboard fires the three reports endpoints on first visit.
    const dashReqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(
      dashReqs.find((r) => /\/api\/decks(\?|$)/.test(r.url) && r.method === 'GET'),
    ).toBeTruthy()
    expect(
      dashReqs.find((r) => /\/api\/reports\/today/.test(r.url) && r.method === 'GET'),
    ).toBeTruthy()
    expect(
      dashReqs.find((r) => /\/api\/reports\/overview/.test(r.url) && r.method === 'GET'),
    ).toBeTruthy()

    // 3. Create a deck through the UI.
    await page.goto(APP_BASE + '/decks')
    await page.getByRole('button', { name: /New deck/i }).click()
    const deckName = 'Journey Deck ' + Date.now()
    await page.getByLabel(/Deck name/i).fill(deckName)
    await page.getByLabel(/Description/i).fill('cross-page journey deck')
    await page.getByRole('combobox', { name: 'Category' }).selectOption('personal')
    const createReqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^Create deck$/i }).click()
      await page.waitForURL(/\/decks\/[a-zA-Z0-9-]+/, { timeout: 15_000 })
    })
    expect(
      createReqs.find(
        (r) => /\/api\/decks(\?|$)/.test(r.url) && r.method === 'POST' && r.status === 201,
      ),
    ).toBeTruthy()
    const deckId = (page.url().match(/\/decks\/([a-zA-Z0-9-]+)/) || [])[1] || ''
    expect(deckId).toBeTruthy()

    // 4. Read-after-write: deck appears on /decks list.
    await page.goto(APP_BASE + '/decks')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await expect(page.getByText(deckName)).toBeVisible({ timeout: 10_000 })

    // 5. Add a card through the UI; assert read-after-write on detail page.
    await page.goto(APP_BASE + `/decks/${deckId}/cards/new`)
    const cardFront = 'Journey card front ' + Date.now()
    await page.getByLabel(/^Front$/i).fill(cardFront)
    await page.getByLabel(/^Back$/i).fill('Journey card back')
    await page.getByRole('button', { name: /Create card/i }).click()
    await page.waitForURL(new RegExp(`/decks/${deckId}$`), { timeout: 15_000 })
    await expect(page.getByText(cardFront)).toBeVisible({ timeout: 10_000 })

    // 6. Study a card. POST /api/study/review must fire and total_reviews increments.
    const beforeOverview = await page.request.get(API_BASE + '/reports/overview')
    const beforeTotal = (await beforeOverview.json())?.total_reviews ?? 0
    // Need at least one card; create more via API for a stable session.
    for (let i = 0; i < 3; i++) {
      await page.request.post(API_BASE + '/cards', {
        data: { deck_id: deckId, front: 'Q' + i + ' ' + Date.now(), back: 'A', tags: [] },
      })
    }
    await page.goto(APP_BASE + '/study/' + deckId)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await page.keyboard.press(' ')
    await page.locator('[data-mol-id="answer-good"]').waitFor({ timeout: 10_000 })
    const reviewReqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="answer-good"]').click()
      await page.waitForTimeout(800)
    })
    expect(
      reviewReqs.find(
        (r) => /\/api\/study\/review/.test(r.url) && r.method === 'POST' && r.status < 300,
      ),
    ).toBeTruthy()
    const afterOverview = await page.request.get(API_BASE + '/reports/overview')
    const afterTotal = (await afterOverview.json())?.total_reviews ?? 0
    expect(
      afterTotal,
      'total_reviews must increment after a real review POST',
    ).toBeGreaterThanOrEqual(beforeTotal + 1)

    // 7. Settings: change theme to Dark, persists across reload.
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const themeReqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-theme-dark"]').click()
      await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10_000 })
    })
    expect(
      themeReqs.find(
        (r) => /\/api\/profile\/me/.test(r.url) && r.method === 'PATCH' && r.status < 300,
      ),
    ).toBeTruthy()
    await page.reload()
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="settings-theme-dark"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    // 8. Notifications: empty for a fresh user; seed via API; new notification appears.
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/No notifications/i)).toBeVisible({ timeout: 10_000 })
    const notifTitle = 'Journey notif ' + Date.now()
    const post = await page.request.post(API_BASE + '/notifications', {
      data: { type: 'system_message', title: notifTitle, body: 'hello' },
    })
    expect(post.status()).toBe(201)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(notifTitle)).toBeVisible({ timeout: 10_000 })
  })
})
