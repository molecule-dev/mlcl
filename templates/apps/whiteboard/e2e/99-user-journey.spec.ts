import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  api,
  APP_BASE,
  seedBoard,
  seedCollaborator,
  seedElement,
  seedFrame,
  seedTemplate,
  seedVersion,
  signup,
  uniqueEmail,
} from './_helpers'

/**
 * Kitchen-sink cross-page user journey.
 *
 * Drives a single user through every primary feature of the whiteboard
 * top-to-bottom and asserts the backend invariant after each step
 * (read-after-write). If anything in this test breaks, a real user
 * doing the same flow would also see something broken.
 */
test('full journey: signup → board → element → snapshot → invite → restore → present → delete', async ({
  page,
}) => {
  const { userId, email } = await signup(page)
  expect(
    userId,
    'signup must surface a real userId via /api/users/me lookup or local cache',
  ).toBeTruthy()

  // 1. Create a board through the UI.
  await page.goto(APP_BASE + '/boards')
  const titleInput = page.locator('[data-mol-id="boards-create-title"]')
  if (await titleInput.count().catch(() => 0)) {
    const title = `Journey Board ${Date.now()}`
    await titleInput.fill(title)
    await page.locator('[data-mol-id="boards-create-submit"]').click()
    // Backend invariant: board appears in GET /api/boards.
    await page.waitForTimeout(300)
    const boards = await api<Array<{ id: string; title: string; user_id: string }>>(
      page,
      'GET',
      '/boards',
    )
    expect(
      boards.find((b) => b.title === title),
      'created board must appear in /api/boards',
    ).toBeTruthy()
  }
  // Always create one via the API too, to make subsequent steps deterministic.
  const board = await seedBoard(page, { title: `Journey API ${Date.now()}` })
  expect(board.id).toBeTruthy()

  // 2. Add an element (sticky) to the board via API and verify it renders.
  const sticky = await seedElement(page, {
    board_id: board.id,
    content: { text: 'first sticky', color: '#fef08a' },
  })
  await page.goto(APP_BASE + `/board/${board.id}`)
  await expect(page.locator(`[data-mol-id="board-element-${sticky.id}"]`)).toBeVisible({
    timeout: 10_000,
  })

  // 3. Save a snapshot via API and confirm via versions endpoint.
  const v1 = await seedVersion(page, {
    board_id: board.id,
    change_summary: 'journey snapshot',
    snapshot: { elements: [{ type: 'sticky', x: 10, y: 10, width: 80, height: 80 }] },
  })
  const versions = await api<Array<{ id: string }>>(page, 'GET', `/versions/${board.id}`)
  expect(
    versions.some((v) => v.id === v1.id),
    'snapshot must appear in /api/versions/:boardId',
  ).toBe(true)

  // 4. Invite a collaborator (by email) and confirm membership row.
  const inviteEmail = uniqueEmail('invitee')
  const collab = await seedCollaborator(page, {
    board_id: board.id,
    email: inviteEmail,
    role: 'editor',
  })
  expect(collab.id).toBeTruthy()
  const collaborators = await api<Array<{ email?: string; role?: string }>>(
    page,
    'GET',
    `/collaborators/${board.id}`,
  )
  expect(
    collaborators.find((c) => (c.email ?? '').toLowerCase() === inviteEmail.toLowerCase()),
    'invitee must appear in /api/collaborators/:boardId',
  ).toBeTruthy()

  // 5. Restore the snapshot — elements should be replaced.
  await api(page, 'POST', `/versions/${board.id}/${v1.id}/restore`)
  const after = await api<Array<{ type: string }>>(page, 'GET', `/elements/${board.id}`)
  expect(after.length, 'restore must replace elements with the snapshot contents').toBe(1)
  expect(after[0].type).toBe('sticky')

  // 6. Add a presentation frame and walk to /board/:id/present.
  const frame = await seedFrame(page, { board_id: board.id, name: 'Journey Slide', order_index: 0 })
  expect(frame.id).toBeTruthy()
  await page.goto(APP_BASE + `/board/${board.id}/present`)
  await expect(page.locator('[data-mol-id="present-frame"]')).toContainText('Journey Slide', {
    timeout: 10_000,
  })

  // 7. Save a template from this user; instantiate it; new board appears.
  const tpl = await seedTemplate(page, { name: `Journey Tpl ${Date.now()}` })
  const inst = await api<{ id: string }>(page, 'POST', `/templates/${tpl.id}/instantiate`, {})
  expect(inst.id, 'instantiate must return a new board id').toBeTruthy()
  const myBoards = await api<Array<{ id: string }>>(page, 'GET', '/boards')
  expect(
    myBoards.some((b) => b.id === inst.id),
    'instantiated template must appear in /api/boards',
  ).toBe(true)

  // 8. Soft-delete the original board and confirm it's gone from the list.
  await api(page, 'DELETE', `/boards/${board.id}`)
  const boardsAfter = await api<Array<{ id: string }>>(page, 'GET', '/boards')
  expect(
    boardsAfter.some((b) => b.id === board.id),
    'deleted board must NOT appear in /api/boards',
  ).toBe(false)

  // 9. /api/users/me reflects the original signup email — auth survived the journey.
  const me = await api<{ email?: string }>(page, 'GET', '/users/me')
  expect((me.email ?? '').toLowerCase()).toBe(email.toLowerCase())
})
