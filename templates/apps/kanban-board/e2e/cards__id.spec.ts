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

test.describe('card detail', () => {
  test('comment posts and persists round-trip', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'Card Detail Board')
    const list = await createList(page, board.id, 'To Do')
    const card = await createCard(page, { boardId: board.id, listId: list.id, title: 'Discuss me' })

    await page.goto(APP_BASE + `/cards/${card.id}`)
    await expect(page.getByTestId('card-title')).toHaveText('Discuss me')

    const body = `First comment ${Date.now()}`
    await page.getByTestId('card-comment-input').fill(body)
    await page.getByTestId('card-comment-submit').click()

    await expect(page.getByText(body)).toBeVisible({ timeout: 8000 })

    // INVARIANT: comment persisted.
    const res = await page.request.get(`${API_BASE}/comments?card_id=${card.id}`)
    const comments = await res.json()
    expect(comments).toHaveLength(1)
    expect(comments[0].body).toBe(body)
  })

  test('priority change persists and re-renders', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'Priority Board')
    const list = await createList(page, board.id, 'To Do')
    const card = await createCard(page, { boardId: board.id, listId: list.id, title: 'Prio me' })

    await page.goto(APP_BASE + `/cards/${card.id}`)
    await page.getByTestId('card-priority-urgent').click()
    await expect(page.getByTestId('card-priority-urgent')).toHaveClass(
      /text-on-primary|bg-primary/,
      { timeout: 5000 },
    )

    const res = await page.request.get(`${API_BASE}/cards/${card.id}`)
    const fresh = await res.json()
    expect(fresh.priority).toBe('urgent')
  })

  test('edit title and description via dialog persists', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'EditBoard')
    const list = await createList(page, board.id, 'Doing')
    const card = await createCard(page, { boardId: board.id, listId: list.id, title: 'Old title' })

    await page.goto(APP_BASE + `/cards/${card.id}`)
    await page.getByTestId('card-edit-title').click()
    await page.getByLabel(/^Title$/i).fill('New shiny title')
    await page.getByRole('button', { name: /^Save$/i }).click()
    await expect(page.getByTestId('card-title')).toHaveText('New shiny title', { timeout: 8000 })

    await page.getByTestId('card-edit-description').click()
    await page.getByLabel(/^Description$/i).fill('A useful description.')
    await page.getByRole('button', { name: /^Save$/i }).click()
    await expect(page.getByText('A useful description.')).toBeVisible({ timeout: 8000 })

    const res = await page.request.get(`${API_BASE}/cards/${card.id}`)
    const fresh = await res.json()
    expect(fresh.title).toBe('New shiny title')
    expect(fresh.description).toEqual({ text: 'A useful description.' })
  })

  test('archive button moves card to archived and navigates back to board', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'Archive Board')
    const list = await createList(page, board.id, 'To Do')
    const card = await createCard(page, { boardId: board.id, listId: list.id, title: 'Archive me' })

    await page.goto(APP_BASE + `/cards/${card.id}`)
    await page.getByTestId('card-archive').click()
    await expect(page).toHaveURL(new RegExp(`/boards/${board.id}$`), { timeout: 8000 })

    const res = await page.request.get(`${API_BASE}/cards/${card.id}`)
    const fresh = await res.json()
    expect(fresh.is_archived).toBe(true)
  })

  test('card title is rendered', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'Title Board')
    const list = await createList(page, board.id, 'To Do')
    const card = await createCard(page, {
      boardId: board.id,
      listId: list.id,
      title: 'My visible title',
    })
    await page.goto(APP_BASE + `/cards/${card.id}`)
    await expect(page.getByTestId('card-title')).toHaveText('My visible title')
  })

  test('comment input field accepts a value', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'Comment Field Board')
    const list = await createList(page, board.id, 'To Do')
    const card = await createCard(page, { boardId: board.id, listId: list.id, title: 'Type me' })
    await page.goto(APP_BASE + `/cards/${card.id}`)
    const input = page.getByTestId('card-comment-input')
    await input.fill('typed body')
    await expect(input).toHaveValue('typed body')
  })

  test('GET /api/cards/:id and GET /api/comments fire on card mount', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'Network Card Board')
    const list = await createList(page, board.id, 'To Do')
    const card = await createCard(page, {
      boardId: board.id,
      listId: list.id,
      title: 'Network me',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/cards/${card.id}`)
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const cardCall = reqs.find(
      (r) => new RegExp(`/api/cards/${card.id}\\b`).test(r.url) && r.method === 'GET',
    )
    const commentsCall = reqs.find(
      (r) => /\/api\/comments\?.*card_id=/.test(r.url) && r.method === 'GET',
    )
    expect(cardCall, 'GET /api/cards/:id should fire').toBeTruthy()
    expect(commentsCall, 'GET /api/comments?card_id should fire').toBeTruthy()
  })
})
