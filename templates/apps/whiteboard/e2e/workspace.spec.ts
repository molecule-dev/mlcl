import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  signup,
  api,
  seedBoard,
  seedCollaborator,
  uniqueEmail,
  captureNetwork,
  APP_BASE,
} from './_helpers'

test.describe('workspace — members & roles', () => {
  test('empty state shows zero KPIs and "no collaborators" message', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/workspace')
    await expect(page.locator('[data-mol-id="workspace-kpi-totalBoards"]')).toContainText('0')
    await expect(page.locator('[data-mol-id="workspace-kpi-totalCollaborators"]')).toContainText(
      '0',
    )
    await expect(page.locator('[data-mol-id="workspace-empty"]')).toBeVisible()
  })

  test('seeded boards & collaborators populate KPIs and members table', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page, { title: 'Team board' })
    const inviteEmail = uniqueEmail('invitee')
    await seedCollaborator(page, { board_id: board.id, email: inviteEmail, role: 'editor' })
    await page.goto(APP_BASE + '/workspace')
    await expect(page.locator('[data-mol-id="workspace-kpi-totalBoards"]')).toContainText('1')
    await expect(page.locator('[data-mol-id="workspace-kpi-totalCollaborators"]')).toContainText(
      '1',
    )
    const members = page.locator('[data-mol-id="workspace-members"]')
    await expect(members).toBeVisible()
    await expect(members).toContainText(inviteEmail)
    await expect(members).toContainText(/editor/i)
  })

  test('inviting via the form POSTs and the new collaborator appears in the table', async ({
    page,
  }) => {
    await signup(page)
    const board = await seedBoard(page, { title: 'Pop board' })
    await page.goto(APP_BASE + '/workspace')
    await page.locator('[data-mol-id="workspace-invite-toggle"]').click()
    await expect(page.locator('[data-mol-id="workspace-invite-form"]')).toBeVisible()
    await page.locator('[data-mol-id="workspace-invite-board"]').selectOption(board.id)
    const email = uniqueEmail('flow-invitee')
    await page.locator('[data-mol-id="workspace-invite-email"]').fill(email)
    await page.locator('[data-mol-id="workspace-invite-role"]').selectOption('commenter')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="workspace-invite-submit"]').click()
      await expect(page.locator('[data-mol-id="workspace-invite-status"]')).toBeVisible()
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' &&
          new RegExp(`/api/collaborators/${board.id}`).test(r.url) &&
          r.status < 400,
      ),
      `expected POST /api/collaborators/${board.id} from workspace invite — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
    // Backend invariant: GET /api/collaborators/:boardId now contains the email.
    const collabs = await api<Array<{ email?: string; role?: string }>>(
      page,
      'GET',
      `/collaborators/${board.id}`,
    )
    expect(collabs.some((c) => c.email?.toLowerCase() === email.toLowerCase())).toBe(true)
    expect(collabs.find((c) => c.email?.toLowerCase() === email.toLowerCase())?.role).toBe(
      'commenter',
    )
  })

  test('role filter shows only matching collaborators', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page, { title: 'Filter board' })
    const editor = uniqueEmail('e')
    const viewer = uniqueEmail('v')
    await seedCollaborator(page, { board_id: board.id, email: editor, role: 'editor' })
    await seedCollaborator(page, { board_id: board.id, email: viewer, role: 'viewer' })
    await page.goto(APP_BASE + '/workspace')
    await page.locator('[data-mol-id="workspace-filter-editor"]').click()
    await expect(page.locator('[data-mol-id="workspace-members"]')).toContainText(editor)
    await expect(page.locator('[data-mol-id="workspace-members"]')).not.toContainText(viewer)
    await page.locator('[data-mol-id="workspace-filter-viewer"]').click()
    await expect(page.locator('[data-mol-id="workspace-members"]')).toContainText(viewer)
    await expect(page.locator('[data-mol-id="workspace-members"]')).not.toContainText(editor)
  })
})
