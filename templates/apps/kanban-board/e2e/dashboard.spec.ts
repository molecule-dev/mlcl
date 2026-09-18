import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  API_BASE,
  captureNetwork,
  createBoard,
  createCard,
  createList,
  signup,
} from './_helpers.js'

test.describe('dashboard', () => {
  test('first-time signup lands on dashboard with the welcome empty-state heading', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(/Welcome to Driftboard/i)).toBeVisible()
  })

  test('dashboard-empty-create opens the dialog and creates a board → /boards/:id', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByTestId('dashboard-empty-create').click()
    await page.getByLabel(/Board name/i).fill('First board')
    await page.getByRole('button', { name: /Create board/i }).click()
    await expect(page).toHaveURL(/\/boards\/[0-9a-f-]{36}$/, { timeout: 15_000 })
  })

  test('header dashboard-new-board CTA opens the same create-board dialog', async ({ page }) => {
    await signup(page)
    await createBoard(page, 'Existing Board')
    await page.goto(APP_BASE + '/dashboard')
    await page.getByTestId('dashboard-new-board').click()
    await expect(page.getByLabel(/Board name/i)).toBeVisible()
  })

  test('subline shows the open-card / active-board count once boards exist', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'KPI Board')
    const list = await createList(page, board.id, 'To Do')
    await createCard(page, { boardId: board.id, listId: list.id, title: 'Card 1' })
    await createCard(page, { boardId: board.id, listId: list.id, title: 'Card 2' })
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(/2 open cards across 1 active boards/i)).toBeVisible()

    // INVARIANT — open count equals active cards count from API
    const cardsRes = await page.request.get(`${API_BASE}/cards?archived=all`)
    const cards = await cardsRes.json()
    expect(cards.filter((c: { is_archived: boolean }) => !c.is_archived)).toHaveLength(2)
  })

  test('clicking a board tile navigates to /boards/:id', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'Click Me Board')
    await page.goto(APP_BASE + '/dashboard')
    await page.getByTestId(`dashboard-board-${board.id}`).click()
    await expect(page).toHaveURL(new RegExp(`/boards/${board.id}$`), { timeout: 10_000 })
  })

  test('GET /api/boards and GET /api/cards fire on dashboard mount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const boards = reqs.find((r) => /\/api\/boards(?:\?|$)/.test(r.url) && r.method === 'GET')
    const cards = reqs.find((r) => /\/api\/cards\?.*archived=all/.test(r.url) && r.method === 'GET')
    expect(boards, 'GET /api/boards should fire on dashboard').toBeTruthy()
    expect(cards, 'GET /api/cards?archived=all should fire on dashboard').toBeTruthy()
    expect(boards!.status).toBeLessThan(300)
    expect(cards!.status).toBeLessThan(300)
  })
})
