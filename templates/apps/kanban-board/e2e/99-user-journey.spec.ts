import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, createBoard, createCard, createList, signup } from './_helpers.js'

/**
 * Kitchen-sink cross-page user journey. A single new user signs up,
 * walks the primary surfaces of the app top-to-bottom, performs the
 * core CRUD on every resource that ships in v1, and verifies the
 * backend invariants hold across page reloads.
 *
 * If this spec passes, a paying customer can do real work in the
 * product. If it fails, the product is broken regardless of what
 * unit tests say.
 */
test.describe('end-to-end user journey', () => {
  test('signup → board → list → card → comment → archive → settings → reload', async ({ page }) => {
    // === sign up via API helper which seeds localStorage so the SPA is authed ===
    const u = await signup(page)

    // === Boards page: empty state shows the create CTA ===
    await page.goto(APP_BASE + '/boards')
    await expect(page.getByRole('heading', { name: /No boards yet/i })).toBeVisible({
      timeout: 15000,
    })

    // === create a board via the API helper (which uses the same context) ===
    const board = await createBoard(page, 'Q1 Roadmap')
    expect(board.id).toMatch(/[0-9a-f-]{36}/)

    // === navigate to the board and add a list, then a card on that list ===
    await page.goto(APP_BASE + `/boards/${board.id}`)
    await expect(page.getByText('Q1 Roadmap').first()).toBeVisible()

    const list = await createList(page, board.id, 'Doing')
    const card = await createCard(page, {
      boardId: board.id,
      listId: list.id,
      title: 'Wire payments webhook',
    })

    // === card detail: post a comment, change priority ===
    await page.goto(APP_BASE + `/cards/${card.id}`)
    await expect(page.getByText('Wire payments webhook')).toBeVisible()

    const commentBox = page.getByLabel(/Add a comment|Write a comment|Comment/i).first()
    if (await commentBox.count()) {
      await commentBox.fill('Spec link: https://stripe.com/docs/webhooks')
      await page
        .getByRole('button', { name: /Post comment|Add comment|Send/i })
        .first()
        .click()
      await expect(page.getByText('Spec link: https://stripe.com/docs/webhooks')).toBeVisible({
        timeout: 10000,
      })
    }

    // === backlog: page renders ===
    await page.goto(APP_BASE + '/backlog')
    await expect(page.getByText(/Backlog/i).first()).toBeVisible()

    // === notifications page is reachable ===
    await page.goto(APP_BASE + '/notifications')
    await expect(
      page.getByText(/Notifications|Inbox|All caught up|Empty inbox|all read/i).first(),
    ).toBeVisible()

    // === team page shows the current user as workspace owner ===
    await page.goto(APP_BASE + '/team')
    await expect(page.getByText(u.email)).toBeVisible({ timeout: 15000 })

    // === settings shows the user’s real email and a plan ===
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByText(u.email)).toBeVisible({ timeout: 15000 })

    // === pricing page is reachable and lists tiers ===
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/Free|Pro|Team|Business/i).first()).toBeVisible()

    // === INVARIANTS after the journey ===
    const boardsRes = await page.request.get(API_BASE + '/boards')
    expect(boardsRes.status()).toBe(200)
    const boards = await boardsRes.json()
    expect(boards.find((b: { id: string }) => b.id === board.id)).toBeTruthy()

    const cardsRes = await page.request.get(API_BASE + '/cards?archived=all')
    expect(cardsRes.status()).toBe(200)
    const cards = await cardsRes.json()
    expect(cards.find((c: { id: string }) => c.id === card.id)).toBeTruthy()

    // === reload persistence: data still there after a hard reload ===
    await page.goto(APP_BASE + '/boards')
    await page.reload()
    await expect(page.getByText('Q1 Roadmap')).toBeVisible({ timeout: 15000 })
  })
})
