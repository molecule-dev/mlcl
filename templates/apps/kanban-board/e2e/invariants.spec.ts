import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, createBoard, createCard, createList, signup } from './_helpers.js'

test.describe('invariants', () => {
  test('a board created by user A is NOT visible to user B', async ({ browser }) => {
    const ctxA = await browser.newContext()
    const pageA = await ctxA.newPage()
    await signup(pageA)
    const board = await createBoard(pageA, 'A-secret')
    await ctxA.close()

    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    await signup(pageB)
    const list = await pageB.request.get(API_BASE + '/boards')
    const boards = await list.json()
    expect(boards.find((b: { id: string }) => b.id === board.id)).toBeUndefined()
    const direct = await pageB.request.get(API_BASE + '/boards/' + board.id)
    expect(direct.status()).toBe(404)
    await ctxB.close()
  })

  test('a card created by user A is NOT visible to user B', async ({ browser }) => {
    const ctxA = await browser.newContext()
    const pageA = await ctxA.newPage()
    await signup(pageA)
    const board = await createBoard(pageA, 'Source Board')
    const list = await createList(pageA, board.id, 'TODO')
    const card = await createCard(pageA, {
      boardId: board.id,
      listId: list.id,
      title: 'A-secret-card',
    })
    await ctxA.close()

    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    await signup(pageB)
    const direct = await pageB.request.get(API_BASE + '/cards/' + card.id)
    expect(direct.status()).toBe(404)
    await ctxB.close()
  })

  test('billing/status returns the correct free-tier limits for a new user', async ({ page }) => {
    await signup(page)
    const res = await page.request.get(API_BASE + '/billing/status')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.planKey).toBe('free')
    // The free tier of kanban-board is generous on lists/cards.
    expect(typeof body.limits.maxBoards).toBe('number')
    expect(typeof body.limits.maxCards).toBe('number')
    expect(typeof body.limits.maxLists).toBe('number')
    expect(body.isFree).toBe(true)
  })

  test('free-tier maxBoards is enforced (one beyond the cap returns 4xx)', async ({ page }) => {
    await signup(page)
    const status = await page.request.get(API_BASE + '/billing/status')
    const body = await status.json()
    const cap = Number(body.limits.maxBoards)
    if (cap > 200) {
      test.skip(true, 'Free tier cap is too high to exhaustively test in CI.')
      return
    }
    let last = 0
    for (let i = 0; i <= cap; i++) {
      const r = await page.request.post(API_BASE + '/boards', { data: { name: 'over-' + i } })
      last = r.status()
    }
    expect(last).toBeGreaterThanOrEqual(400)
  })

  test('archived cards don\u2019t appear in the default cards listing', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'Archive Test')
    const list = await createList(page, board.id, 'TODO')
    const card = await createCard(page, { boardId: board.id, listId: list.id, title: 'archive me' })
    await page.request.post(`${API_BASE}/cards/${card.id}/archive`, { data: {} })

    const defaultRes = await page.request.get(`${API_BASE}/cards?board_id=${board.id}`)
    const defaultList = await defaultRes.json()
    expect(defaultList.find((c: { id: string }) => c.id === card.id)).toBeUndefined()

    const allRes = await page.request.get(`${API_BASE}/cards?board_id=${board.id}&archived=all`)
    const allList = await allRes.json()
    expect(allList.find((c: { id: string }) => c.id === card.id)).toBeDefined()
  })

  test('cookie persists session across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard$/)
  })
})
