import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { signup, seedBoard, seedCollaborator, captureNetwork, APP_BASE } from './_helpers'

test.describe('shared boards', () => {
  test('empty state when nothing is shared with you', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/shared')
      await expect(page.locator('[data-mol-id="shared-empty"]')).toBeVisible()
      await expect(page.locator('[data-mol-id="shared-count"]')).toContainText('0')
    })
    expect(
      reqs.some((r) => r.method === 'GET' && /\/api\/boards\/shared/.test(r.url) && r.status < 400),
      `expected GET /api/boards/shared on /shared load — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
  })

  test('boards another user invited me to appear in the grid', async ({ page, browser }) => {
    // Owner context: signs up + invites the test user.
    const ownerCtx = await browser.newContext()
    const ownerPage = await ownerCtx.newPage()
    try {
      await signup(ownerPage)
      const board = await seedBoard(ownerPage, { title: 'Owner board' })
      // Invitee context (the page-under-test): signs up second.
      const invitee = await signup(page)
      await seedCollaborator(ownerPage, {
        board_id: board.id,
        email: invitee.email,
        role: 'editor',
      })
      // The invitee navigates to /shared and should see Owner's board.
      await page.goto(APP_BASE + '/shared')
      await expect(page.locator('[data-mol-id="shared-grid"]')).toBeVisible()
      await expect(page.locator(`[data-mol-id="shared-board-${board.id}"]`)).toBeVisible()
      // Filter "editor" must keep it visible; "viewer" must hide it.
      await page.locator('[data-mol-id="shared-filter-editor"]').click()
      await expect(page.locator(`[data-mol-id="shared-board-${board.id}"]`)).toBeVisible()
      await page.locator('[data-mol-id="shared-filter-viewer"]').click()
      await expect(page.locator(`[data-mol-id="shared-board-${board.id}"]`)).toHaveCount(0)
    } finally {
      await ownerCtx.close().catch(() => undefined)
    }
  })
})
