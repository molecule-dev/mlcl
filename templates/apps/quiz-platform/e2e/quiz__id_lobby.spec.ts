import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, buildPublishedQuiz, captureNetwork, signup } from './_helpers.js'

test.describe('/quiz/:id/lobby (HostLobby)', () => {
  test('renders host-lobby landmark after session is created', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/lobby')
    await expect(page.getByTestId('host-lobby')).toBeVisible({ timeout: 15000 })
  })

  test('"Cancel lobby" button → /quiz/{id}', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/lobby')
    await expect(page.getByTestId('host-lobby')).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /cancel lobby/i }).click()
    await expect(page).toHaveURL(new RegExp(`/quiz/${built.id}$`))
  })

  test('Join code hero shows the 6-letter session.join_code', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/lobby')
    await expect(page.getByTestId('host-lobby')).toBeVisible({ timeout: 15000 })
    // The amber join code is rendered in tracking-widest font-mono — assert it's a 6-char alphanumeric
    const joinCodeText = await page
      .locator('.font-mono.tracking-\\[0\\.25em\\]')
      .first()
      .textContent()
    expect(joinCodeText?.trim()).toMatch(/^[A-Z0-9]{4,8}$/)
  })

  test('"Copy" button writes to clipboard and surfaces "copied" status', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
    const page = await ctx.newPage()
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/lobby')
    await expect(page.getByTestId('host-lobby')).toBeVisible({ timeout: 15000 })
    await page
      .getByRole('button', { name: /^copy$/i })
      .first()
      .click()
    await expect(page.getByTestId('copied')).toBeVisible({ timeout: 5000 })
    await ctx.close()
  })

  test('"Start the spark" POSTs /api/sessions/{id}/start and navigates to /play?sessionId=…', async ({
    page,
  }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/lobby')
    await expect(page.getByTestId('host-lobby')).toBeVisible({ timeout: 15000 })
    // Wait for player polling to register the host as a participant so Start is enabled.
    await expect(page.getByTestId('player-list')).toBeVisible({ timeout: 8000 })
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /start the spark/i }).click()
      await page.waitForURL(new RegExp(`/quiz/${built.id}/play\\?sessionId=`), { timeout: 15000 })
    })
    const start = reqs.find(
      (r) => r.method === 'POST' && /\/api\/sessions\/[^/]+\/start/.test(r.url),
    )
    expect(start).toBeTruthy()
    expect(start?.status).toBe(200)
  })

  test('player-count badge renders with text "live"', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/lobby')
    await expect(page.getByTestId('host-lobby')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('player-count')).toContainText(/live/i)
  })

  test('player-list eventually contains the host entry', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/lobby')
    await expect(page.getByTestId('host-lobby')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('player-list')).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('player-list').locator('li').first()).toBeVisible()
  })

  test('House rules section lists three rules', async ({ page }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    await page.goto(APP_BASE + '/quiz/' + built.id + '/lobby')
    await expect(page.getByTestId('host-lobby')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/faster.*more points/i)).toBeVisible()
    await expect(page.getByText(/streak multiplier/i)).toBeVisible()
    await expect(page.getByText(/no skips/i)).toBeVisible()
  })

  test('Mount POST /api/sessions + POST /api/sessions/{id}/join + GET leaderboard polled (gate-12)', async ({
    page,
  }) => {
    await signup(page)
    const built = await buildPublishedQuiz(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/quiz/' + built.id + '/lobby')
      await expect(page.getByTestId('host-lobby')).toBeVisible({ timeout: 15000 })
    })
    const create = reqs.find((r) => r.method === 'POST' && /\/api\/sessions(\?|$)/.test(r.url))
    const join = reqs.find((r) => r.method === 'POST' && /\/api\/sessions\/[^/]+\/join/.test(r.url))
    const board = reqs.find(
      (r) => r.method === 'GET' && /\/api\/leaderboard\/session\//.test(r.url),
    )
    expect(create, 'POST /api/sessions').toBeTruthy()
    expect(create?.status).toBe(201)
    expect(join, 'POST /api/sessions/{id}/join').toBeTruthy()
    expect(board, 'GET /api/leaderboard/session/{id}').toBeTruthy()
  })
})
