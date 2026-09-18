import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  signup,
  api,
  seedBoard,
  seedElement,
  seedVersion,
  captureNetwork,
  APP_BASE,
} from './_helpers'

test.describe('/board/:id/history — version history list & restore', () => {
  test('empty state appears for a board with no snapshots', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page, { title: 'Fresh board' })
    await page.goto(APP_BASE + `/board/${board.id}/history`)
    await expect(page.locator('[data-mol-id="version-empty"]')).toBeVisible()
  })

  test('snapshots from API render in the timeline and "Restore" navigates back to the board', async ({
    page,
  }) => {
    await signup(page)
    const board = await seedBoard(page)
    await seedElement(page, { board_id: board.id, content: { text: 'first' } })
    const v1 = await seedVersion(page, {
      board_id: board.id,
      change_summary: 'first snapshot',
      snapshot: { elements: [{ type: 'sticky', x: 1, y: 1, width: 50, height: 50 }] },
    })
    const v2 = await seedVersion(page, {
      board_id: board.id,
      change_summary: 'second snapshot',
      snapshot: { elements: [] },
    })
    await page.goto(APP_BASE + `/board/${board.id}/history`)
    await expect(page.locator(`[data-mol-id="version-item-${v1.id}"]`)).toBeVisible()
    await expect(page.locator(`[data-mol-id="version-item-${v2.id}"]`)).toBeVisible()
    await page.locator(`[data-mol-id="version-item-${v1.id}"]`).click()
    await expect(page.locator('[data-mol-id="version-detail"]')).toContainText('first snapshot')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="version-restore"]').click()
      await expect(page.locator('[data-mol-id="version-status"]')).toBeVisible()
      await page.waitForURL(new RegExp(`/board/${board.id}$`), { timeout: 8_000 })
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' &&
          new RegExp(`/api/versions/${board.id}/${v1.id}/restore`).test(r.url) &&
          r.status < 400,
      ),
      `expected POST /api/versions/${board.id}/:versionId/restore — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
    // Backend invariant: the restore replaced existing elements with the snapshot's elements.
    const after = await api<Array<{ id: string; type: string }>>(
      page,
      'GET',
      `/elements/${board.id}`,
    )
    expect(after.length).toBe(1) // snapshot contained 1 element
    expect(after[0].type).toBe('sticky')
  })

  test('back link returns to the canvas', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page)
    await page.goto(APP_BASE + `/board/${board.id}/history`)
    await page.locator('[data-mol-id="version-back"]').click()
    await expect(page).toHaveURL(new RegExp(`/board/${board.id}$`))
  })
})
