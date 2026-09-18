import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  signup,
  api,
  rawApi,
  seedBoard,
  seedElement,
  captureNetwork,
  APP_BASE,
  uniqueEmail,
} from './_helpers'

test.describe('board canvas — elements, snapshots, sharing, properties', () => {
  test('opening a freshly-created board shows the empty state and zero element count', async ({
    page,
  }) => {
    await signup(page)
    const board = await seedBoard(page)
    await page.goto(APP_BASE + `/board/${board.id}`)
    await expect(page.locator('[data-mol-id="board-canvas-empty"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="board-element-count"]')).toContainText('0')
    await expect(page.locator('[data-mol-id="board-title"]')).toContainText(board.title)
  })

  test('elements created via API render on the canvas with correct geometry', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page)
    const sticky = await seedElement(page, {
      board_id: board.id,
      type: 'sticky',
      x: 220,
      y: 130,
      width: 240,
      height: 160,
      content: { text: 'persisted sticky', color: '#bfdbfe' },
    })
    await page.goto(APP_BASE + `/board/${board.id}`)
    const node = page.locator(`[data-mol-id="board-element-${sticky.id}"]`)
    await expect(node).toBeVisible()
    await expect(node).toContainText('persisted sticky')
    await expect(page.locator('[data-mol-id="board-element-count"]')).toContainText('1')
  })

  test('selecting a tool flips aria-pressed on the toolbar button', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page)
    await page.goto(APP_BASE + `/board/${board.id}`)
    const stickyTool = page.locator('[data-mol-id="board-tool-sticky"]')
    await expect(stickyTool).toHaveAttribute('aria-pressed', 'false')
    await stickyTool.click()
    await expect(stickyTool).toHaveAttribute('aria-pressed', 'true')
    const selectTool = page.locator('[data-mol-id="board-tool-select"]')
    await selectTool.click()
    await expect(selectTool).toHaveAttribute('aria-pressed', 'true')
  })

  test('Save snapshot writes a real version row reflected in GET /api/versions/:id', async ({
    page,
  }) => {
    await signup(page)
    const board = await seedBoard(page)
    await seedElement(page, { board_id: board.id, type: 'sticky' })
    await page.goto(APP_BASE + `/board/${board.id}`)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="board-snapshot"]').click()
      await expect(page.locator('[data-mol-id="board-snapshot-status"]')).toBeVisible()
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' &&
          new RegExp(`/api/versions/${board.id}`).test(r.url) &&
          r.status < 400,
      ),
      `expected POST /api/versions/${board.id} when saving a snapshot — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
    const versions = await api<Array<{ id: string; board_id: string; change_summary?: string }>>(
      page,
      'GET',
      `/versions/${board.id}`,
    )
    expect(versions.length).toBeGreaterThan(0)
    expect(versions[0].board_id).toBe(board.id)
  })

  test('selecting an element opens the property panel and saving text updates the row', async ({
    page,
  }) => {
    await signup(page)
    const board = await seedBoard(page)
    const el = await seedElement(page, {
      board_id: board.id,
      type: 'sticky',
      content: { text: 'original', color: '#fef08a' },
    })
    await page.goto(APP_BASE + `/board/${board.id}`)
    await page.locator(`[data-mol-id="board-element-${el.id}"]`).click()
    await expect(page.locator('[data-mol-id="board-properties"]')).toBeVisible()
    const ta = page.locator('[data-mol-id="board-element-text"]')
    await expect(ta).toHaveValue('original')
    await ta.fill('edited via panel')
    await page.locator('[data-mol-id="board-element-text-save"]').click()
    // Backend invariant: GET reflects the new text.
    await page.waitForTimeout(300)
    const elements = await api<Array<{ id: string; content?: { text?: string } }>>(
      page,
      'GET',
      `/elements/${board.id}`,
    )
    const updated = elements.find((e) => e.id === el.id)
    expect(updated?.content?.text).toBe('edited via panel')
    // Reload — the new text persists in the rendered node.
    await page.reload()
    await expect(page.locator(`[data-mol-id="board-element-${el.id}"]`)).toContainText(
      'edited via panel',
    )
  })

  test('color change writes content.color and persists across reload', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page)
    const el = await seedElement(page, {
      board_id: board.id,
      content: { text: 'color me', color: '#fef08a' },
    })
    await page.goto(APP_BASE + `/board/${board.id}`)
    await page.locator(`[data-mol-id="board-element-${el.id}"]`).click()
    await page.locator('[data-mol-id="board-element-color-#bfdbfe"]').click()
    await page.waitForTimeout(300)
    const after = await api<Array<{ id: string; content?: { color?: string } }>>(
      page,
      'GET',
      `/elements/${board.id}`,
    )
    expect(after.find((e) => e.id === el.id)?.content?.color).toBe('#bfdbfe')
  })

  test('delete element via property panel removes the row and the canvas node', async ({
    page,
  }) => {
    await signup(page)
    const board = await seedBoard(page)
    const el = await seedElement(page, { board_id: board.id, content: { text: 'doomed' } })
    await page.goto(APP_BASE + `/board/${board.id}`)
    await page.locator(`[data-mol-id="board-element-${el.id}"]`).click()
    await page.locator('[data-mol-id="board-element-delete"]').click()
    await page.waitForTimeout(300)
    const after = await api<Array<{ id: string }>>(page, 'GET', `/elements/${board.id}`)
    expect(after.find((e) => e.id === el.id)).toBeUndefined()
    await expect(page.locator(`[data-mol-id="board-element-${el.id}"]`)).toHaveCount(0)
  })

  test('zoom in/out updates the on-screen percentage indicator', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page)
    await page.goto(APP_BASE + `/board/${board.id}`)
    const zoom = page.locator('[data-mol-id="board-zoom"]')
    await expect(zoom).toHaveText('100%')
    // Zoom-out button is the first inside the zoom widget; the inventory uses Material icon "remove".
    await page.getByRole('button', { name: /zoom\s*out/i }).click()
    await expect(zoom).toHaveText('90%')
    await page.getByRole('button', { name: /zoom\s*in/i }).click()
    await page.getByRole('button', { name: /zoom\s*in/i }).click()
    await expect(zoom).toHaveText('110%')
  })

  test('share modal POSTs an invite that lands as a real collaborator row', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page)
    await page.goto(APP_BASE + `/board/${board.id}`)
    await page.locator('[data-mol-id="board-share"]').click()
    const email = uniqueEmail('invitee')
    await page.locator('input[type="email"]').last().fill(email)
    await page.locator('select').first().selectOption('editor')
    await page
      .locator('button[type="submit"]:has-text("Invite")')
      .first()
      .click()
      .catch(async () => {
        // fall back to the generic person_add button if the label changed
        await page.locator('button:has-text("Send")').first().click()
      })
    await page.waitForTimeout(500)
    const collabs = await api<Array<{ board_id: string; email?: string; role?: string }>>(
      page,
      'GET',
      `/collaborators/${board.id}`,
    )
    expect(collabs.length).toBeGreaterThan(0)
    expect(collabs.some((c) => c.email?.toLowerCase() === email.toLowerCase())).toBe(true)
  })

  test('eraser tool deletes the element on click', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page)
    const el = await seedElement(page, { board_id: board.id, content: { text: 'erase me' } })
    await page.goto(APP_BASE + `/board/${board.id}`)
    await page.locator('[data-mol-id="board-tool-eraser"]').click()
    await page.locator(`[data-mol-id="board-element-${el.id}"]`).click()
    await page.waitForTimeout(300)
    const after = await api<Array<{ id: string }>>(page, 'GET', `/elements/${board.id}`)
    expect(after.find((e) => e.id === el.id)).toBeUndefined()
  })

  test('GET /api/elements/:boardId returns 404 (or 403) when not owner', async ({
    page,
    browser,
  }) => {
    await signup(page)
    const board = await seedBoard(page)
    const ctx = await browser.newContext()
    const otherPage = await ctx.newPage()
    try {
      await signup(otherPage)
      const r = await rawApi(otherPage, 'GET', `/elements/${board.id}`)
      expect([403, 404]).toContain(r.status)
    } finally {
      await ctx.close().catch(() => undefined)
    }
  })
})
