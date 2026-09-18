/**
 * Space membership — exercise the space-members handler mounted at
 * `/api/spaces/:spaceId/members`. Admins (creator or admin role) can
 * add and remove; viewers/editors can only list.
 *
 * Coverage gate also looks for the literal `/space-members` token,
 * which is what the inventory builder names this handler. The actual
 * URL space is `/spaces/:spaceId/members` (see api/src/handlers/index.ts).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiDelete, apiGet, apiPost, createSpace, signup, uniqueEmail } from './_helpers.js'

interface UserResp {
  props?: { id: string }
  id?: string
}

test('Owner can list /spaces/:id/members for their own space', async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  const list = await apiGet<unknown[]>(page, `/spaces/${space.id}/members`)
  expect(list.status).toBe(200)
  expect(Array.isArray(list.body)).toBe(true)
  // Fresh space — no explicit member rows yet (the creator is implicit).
  expect((list.body as unknown[]).length).toBe(0)
})

test('Admin can POST /spaces/:id/members to invite another user as editor', async ({
  page,
  browser,
}) => {
  // User A — owner
  await signup(page, uniqueEmail('owner'))
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })

  // User B — fresh signup in another context, capture its user id
  const ctxB = await browser.newContext()
  const pB = await ctxB.newPage()
  const credsB = await signup(pB, uniqueEmail('editor'))
  const meB = await apiGet<UserResp>(pB, '/users/me')
  const userBId = meB.body?.props?.id ?? meB.body?.id ?? ''
  expect(userBId).toMatch(/^[0-9a-f-]{36}$/)
  await ctxB.close()

  // A invites B as editor
  const r = await apiPost<{ id: string; user_id: string; role: string }>(
    page,
    `/spaces/${space.id}/members`,
    { user_id: userBId, role: 'editor' },
  )
  expect(r.status).toBe(201)
  expect(r.body?.user_id).toBe(userBId)
  expect(r.body?.role).toBe('editor')

  // GET reflects the new membership row
  const list = await apiGet<Array<{ user_id: string; role: string }>>(
    page,
    `/spaces/${space.id}/members`,
  )
  expect(list.status).toBe(200)
  const arr = (list.body as Array<{ user_id: string; role: string }>) ?? []
  expect(arr.find((m) => m.user_id === userBId && m.role === 'editor')).toBeTruthy()

  // B should now be able to read the space (was 404 before; should be 200 now)
  const ctxB2 = await browser.newContext()
  const pB2 = await ctxB2.newPage()
  await pB2.goto(page.url())
  // Re-login B to get a fresh session
  const { login } = await import('./_helpers.js')
  await login(pB2, credsB.email, credsB.password)
  const got = await apiGet<{ id: string }>(pB2, `/spaces/${space.key}`)
  expect(got.status).toBe(200)
  expect(got.body?.id).toBe(space.id)
  await ctxB2.close()
})

test('Non-admin (viewer) cannot DELETE a member; admin can', async ({ page, browser }) => {
  // Owner A creates space, invites B as viewer
  await signup(page, uniqueEmail('ownerA'))
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })

  const ctxB = await browser.newContext()
  const pB = await ctxB.newPage()
  const credsB = await signup(pB, uniqueEmail('viewer'))
  const meB = await apiGet<UserResp>(pB, '/users/me')
  const userBId = meB.body?.props?.id ?? meB.body?.id ?? ''
  await ctxB.close()

  const r = await apiPost<{ id: string }>(page, `/spaces/${space.id}/members`, {
    user_id: userBId,
    role: 'viewer',
  })
  const memberId = r.body?.id ?? ''
  expect(memberId).toBeTruthy()

  // B tries to delete the membership (their own row) — viewer is not
  // admin, so the delete should be refused.
  const ctxB2 = await browser.newContext()
  const pB2 = await ctxB2.newPage()
  const { login } = await import('./_helpers.js')
  await login(pB2, credsB.email, credsB.password)
  const fail = await apiDelete(pB2, `/spaces/${space.id}/members/${memberId}`)
  expect(fail).toBe(404)
  await ctxB2.close()

  // Owner A can delete the member
  const ok = await apiDelete(page, `/spaces/${space.id}/members/${memberId}`)
  expect(ok).toBe(204)

  // Subsequent list no longer contains the row
  const list = await apiGet<Array<{ id: string }>>(page, `/spaces/${space.id}/members`)
  expect((list.body as Array<{ id: string }>).find((m) => m.id === memberId)).toBeUndefined()
})

test('Cannot list members of a space the user has no access to (authz)', async ({
  page,
  browser,
}) => {
  const ctxA = await browser.newContext()
  const pA = await ctxA.newPage()
  await signup(pA, uniqueEmail('owner'))
  const sA = await createSpace(pA, { key: `pa-${Date.now().toString(36)}`, name: 'Private A' })
  await ctxA.close()

  await signup(page, uniqueEmail('outsider'))
  const r = await apiGet(page, `/spaces/${sA.id}/members`)
  expect(r.status).toBe(404)
})
