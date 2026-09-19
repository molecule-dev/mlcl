/**
 * Cross-page kitchen-sink journey for book-tracker — the signature flow.
 *
 * A real user signs up, sets a challenge goal, adds a book via the form,
 * shelves it as reading, logs progress, finishes it (which auto-completes
 * at the last page), rates + reviews it, and confirms the challenge and
 * review feed updated — with read-after-write checks on every step.
 *
 * Drives the running dev server (vite=3100, api=4100) backed by Postgres.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, getChallenge, signup } from './_helpers.js'

test.describe('99 user journey', () => {
  test.setTimeout(120_000)

  test('signup → add book → read → finish → review → challenge updates', async ({ page }) => {
    const { accessToken, userId, email } = await signup(page)
    expect(userId).toBeTruthy()

    // 1) Land on dashboard with the empty state.
    await expect(page).toHaveURL(/\/dashboard/)
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1')
        const err = document.querySelector('.text-error')
        return !!h1 || !!err
      },
      { timeout: 15000 },
    )
    await expect(page.locator('h1').first()).toContainText(/today/i, { timeout: 15000 })
    await expect(page.getByText(/nothing in progress/i)).toBeVisible({ timeout: 10000 })

    // 2) Set this year's challenge goal via the Challenge page.
    await page.goto(APP_BASE + '/challenge')
    await page.locator('[data-mol-id="challenge-goal-input"]').fill('10')
    await page.locator('[data-mol-id="challenge-goal-save"]').click()
    await expect
      .poll(async () => (await getChallenge(page, accessToken)).goal_books, { timeout: 10000 })
      .toBe(10)

    // 3) Add a book via the Add Book form, shelved straight into Reading.
    const title = `Journey Book ${Date.now()}`
    await page.goto(APP_BASE + '/books/new')
    await page.locator('[data-mol-id="add-book-title"]').fill(title)
    await page.locator('[data-mol-id="add-book-author"]').fill('Journey Author')
    await page.locator('[data-mol-id="add-book-pages"]').fill('100')
    await page.getByRole('button', { name: /^reading$/i }).click()
    const createReqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="add-book-submit"]').click()
      await page.waitForURL(/\/books\/(?!new)[0-9a-f-]{8,}/, { timeout: 15000 })
    })
    const createCall = createReqs.find((r) => /\/api\/books$/.test(r.url) && r.method === 'POST')
    expect(createCall?.status, JSON.stringify(createReqs)).toBe(201)
    const bookId = page.url().split('/books/')[1]

    // 4) Read-after-write: GET /api/books returns it on the reading shelf.
    let res = await page.request.get(`${API_BASE}/books`, { headers: apiHeaders(accessToken) })
    let books = (await res.json()) as Array<{
      id: string
      title: string
      my: { shelf: string; current_page: number; percent: number } | null
    }>
    const created = books.find((b) => b.id === bookId)
    expect(created?.title).toBe(title)
    expect(created?.my?.shelf).toBe('reading')
    expect(created?.my?.current_page).toBe(0)

    // 5) Log progress halfway from the detail page.
    await page.locator('[data-mol-id="book-progress-page"]').fill('50')
    await page.locator('[data-mol-id="book-progress-submit"]').click()
    await expect(page.getByText('50%').first()).toBeVisible({ timeout: 10000 })

    // 6) A reading session was logged (delta pages).
    const detail = await page.request.get(`${API_BASE}/books/${bookId}`, {
      headers: apiHeaders(accessToken),
    })
    const detailRow = (await detail.json()) as { my: { id: string; current_page: number } }
    expect(detailRow.my.current_page).toBe(50)
    res = await page.request.get(`${API_BASE}/sessions?user_book_id=${detailRow.my.id}`, {
      headers: apiHeaders(accessToken),
    })
    const sessions = (await res.json()) as { pages_read: number }[]
    expect(sessions.length).toBe(1)
    expect(sessions[0].pages_read).toBe(50)

    // 7) Finish the book via the progress form (auto-finish at page count).
    await page.locator('[data-mol-id="book-progress-page"]').fill('100')
    await page.locator('[data-mol-id="book-progress-submit"]').click()
    await expect(
      page.locator('[data-mol-id="book-shelf-section"] button[aria-pressed="true"]'),
    ).toHaveText(/read/i, { timeout: 10000 })

    // 8) Challenge counts one finished book now.
    const challenge = await getChallenge(page, accessToken)
    expect(challenge.goal_books).toBe(10)
    expect(challenge.books_read).toBe(1)
    expect(challenge.percent).toBeCloseTo(0.1, 5)

    // 9) Rate + review from the detail page.
    await page.locator('[data-mol-id="book-rate-5"]').click()
    await page.locator('[data-mol-id="book-review-text"]').fill('The journey was worth it.')
    await page.locator('[data-mol-id="book-review-save"]').click()
    await expect(page.locator('[data-mol-id="book-review-saved"]')).toBeVisible({
      timeout: 10000,
    })

    // 10) The Reviews feed lists it.
    await page.goto(APP_BASE + '/reviews')
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 })

    // 11) Reports/overview reflects the finish.
    res = await page.request.get(`${API_BASE}/reports/overview`, {
      headers: apiHeaders(accessToken),
    })
    const overview = (await res.json()) as {
      finished_books: number
      pages_read: number
      avg_rating: number
    }
    expect(overview.finished_books).toBe(1)
    expect(overview.pages_read).toBe(100)
    expect(overview.avg_rating).toBe(5)

    // 12) Dashboard shows the finished book in recent activity + stats.
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 })

    // 13) Stats page renders the year's charts.
    await page.goto(APP_BASE + '/stats')
    await expect(page.getByRole('heading', { name: /reading stats/i })).toBeVisible({
      timeout: 10000,
    })

    // 14) Profile page renders user data from /api/profile/me, not placeholders.
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByTestId('profile-email')).toContainText(email)
    await expect(page.getByTestId('profile-plan')).toContainText(/free/i)

    // 15) Settings: change display name and verify persistence.
    await page.goto(APP_BASE + '/settings')
    const newName = `Reader ${Date.now()}`
    const nameField = page.locator('input[type="text"]').first()
    await nameField.fill(newName)
    await page.getByTestId('settings-save').click()
    await expect(page.getByTestId('settings-saved')).toBeVisible({ timeout: 10000 })

    res = await page.request.get(`${API_BASE}/profile/me`, { headers: apiHeaders(accessToken) })
    const profileAfter = (await res.json()) as { name: string }
    expect(profileAfter.name).toBe(newName)

    // 16) Books index lists the finished book; the shelf filter narrows to it.
    await page.goto(APP_BASE + '/books')
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /^read$/i }).click()
    await expect(page.getByText(title).first()).toBeVisible()

    // 17) Pricing page loads with tier cards.
    await page.goto(APP_BASE + '/pricing')
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /pro|plan|book/i })
        .first(),
    ).toBeVisible({ timeout: 10000 })

    // 18) Notifications page loads.
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('h1')).toContainText(/notifications/i)
  })
})
