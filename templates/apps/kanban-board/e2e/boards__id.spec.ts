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

test.describe('board detail', () => {
  test('add list and add card via UI persist to the API', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'My Board')
    await page.goto(APP_BASE + `/boards/${board.id}`)
    await expect(page.getByTestId('board-name')).toHaveText('My Board')

    // Empty state shows the add-list CTA.
    await page.getByTestId('board-empty-add-list').click()
    await page.getByLabel(/List name/i).fill('To Do')
    await page.getByRole('button', { name: /^Add list$/i }).click()
    await expect(page.getByText('To Do', { exact: false })).toBeVisible()

    // INVARIANT: list persisted.
    const listsRes = await page.request.get(`${API_BASE}/lists?board_id=${board.id}`)
    const lists = await listsRes.json()
    expect(lists).toHaveLength(1)
    expect(lists[0].name).toBe('To Do')
    const listId = lists[0].id

    // Add a card to the list via UI.
    await page.getByTestId(`list-add-card-${listId}`).click()
    await page.getByLabel(/Card title/i).fill('Investigate the slow query')
    await page.getByRole('button', { name: /^Add card$/i }).click()
    await expect(page.getByText('Investigate the slow query')).toBeVisible()

    // INVARIANT: card persisted.
    const cardsRes = await page.request.get(`${API_BASE}/cards?board_id=${board.id}`)
    const cards = await cardsRes.json()
    expect(cards).toHaveLength(1)
    expect(cards[0].title).toBe('Investigate the slow query')
    expect(cards[0].list_id).toBe(listId)
  })

  test('moving a card to another list persists to the API', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'Board With Two Lists')
    const todo = await createList(page, board.id, 'To Do')
    const done = await createList(page, board.id, 'Done')
    const card = await createCard(page, { boardId: board.id, listId: todo.id, title: 'Ship it' })

    await page.goto(APP_BASE + `/boards/${board.id}`)
    await expect(page.getByTestId(`card-tile-${card.id}`)).toBeVisible()
    await page.getByTestId(`card-menu-${card.id}`).click()
    await page.getByTestId(`card-move-${card.id}-${done.id}`).click()

    // INVARIANT: card now in Done list.
    await expect(async () => {
      const res = await page.request.get(`${API_BASE}/cards/${card.id}`)
      const fresh = await res.json()
      expect(fresh.list_id).toBe(done.id)
    }).toPass({ timeout: 8000 })
  })

  test('archiving a card removes it from the active board view and persists', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'ArchiveLand')
    const todo = await createList(page, board.id, 'To Do')
    const card = await createCard(page, { boardId: board.id, listId: todo.id, title: 'Old idea' })

    await page.goto(APP_BASE + `/boards/${board.id}`)
    await page.getByTestId(`card-menu-${card.id}`).click()
    await page.getByTestId(`card-archive-${card.id}`).click()

    await expect(page.getByTestId(`card-tile-${card.id}`)).not.toBeVisible({ timeout: 8000 })

    // INVARIANT: archived flag flipped.
    const res = await page.request.get(`${API_BASE}/cards/${card.id}`)
    const fresh = await res.json()
    expect(fresh.is_archived).toBe(true)
  })

  test('star toggle persists', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'Starry')
    await page.goto(APP_BASE + `/boards/${board.id}`)

    const star = page.getByTestId('board-star-toggle')
    await expect(star).toHaveAttribute('aria-pressed', 'false')
    await star.click()
    await expect(star).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 })

    const res = await page.request.get(`${API_BASE}/boards/${board.id}`)
    const fresh = await res.json()
    expect(fresh.is_starred).toBe(true)
  })

  test('rename board via header pencil persists', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'Old Name')
    await page.goto(APP_BASE + `/boards/${board.id}`)
    await page.getByRole('button', { name: /Rename board/i }).click()
    await page.getByLabel(/New name/i).fill('Brand New Name')
    await page.getByRole('button', { name: /^Save$/i }).click()
    await expect(page.getByTestId('board-name')).toHaveText('Brand New Name', { timeout: 8000 })
    const res = await page.request.get(`${API_BASE}/boards/${board.id}`)
    const fresh = await res.json()
    expect(fresh.name).toBe('Brand New Name')
  })

  test('GET /api/boards/:id fires on board mount and returns the board row', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'Network Board')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/boards/${board.id}`)
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const boardCall = reqs.find(
      (r) => new RegExp(`/api/boards/${board.id}\\b`).test(r.url) && r.method === 'GET',
    )
    expect(boardCall, 'GET /api/boards/:id should fire').toBeTruthy()
    expect(boardCall!.status).toBe(200)
  })

  test('card-tile is visible after seeding via API and clickable to /cards/:id', async ({
    page,
  }) => {
    await signup(page)
    const board = await createBoard(page, 'Tile Board')
    const list = await createList(page, board.id, 'To Do')
    const card = await createCard(page, { boardId: board.id, listId: list.id, title: 'Click me' })
    await page.goto(APP_BASE + `/boards/${board.id}`)
    const tile = page.getByTestId(`card-tile-${card.id}`)
    await expect(tile).toBeVisible({ timeout: 15_000 })
    // The clickable open-target is a sibling/child element with its own testid.
    await page.getByTestId(`card-tile-open-${card.id}`).click()
    await expect(page).toHaveURL(new RegExp(`/cards/${card.id}$`), { timeout: 10_000 })
  })
})
