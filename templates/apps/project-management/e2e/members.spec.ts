/**
 * Members API — backend invariants for /api/members. Members let a
 * project owner share a project with collaborators; members get
 * read-and-act access via `accessibleProjectIds` in `_ownership.ts`.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { apiHeaders, seedProject, signup, uniqueEmail } from './_helpers.js'

const apiBase = () => `http://localhost:${process.env.API_PORT || '4020'}/api`

test.describe('members API', () => {
  test('GET /members for an owner is 200 and only returns rows for that project', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('members-list'))
    const proj = await seedProject(page, accessToken, { name: 'Members Proj' })
    const res = await page.request.get(`${apiBase()}/members?project_id=${proj.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const items = (await res.json()) as { id: string; project_id: string }[]
    // A fresh project has no project_members rows yet (the owner has
    // access via ownership, not membership). What we DO require: every
    // returned row, if any, is scoped to the requested project.
    expect(items.every((m) => m.project_id === proj.id)).toBe(true)
  })

  test('POST /members invites another user; subsequent GET reflects the new row', async ({
    browser,
    page,
  }) => {
    // userA owns the project; userB is the invitee.
    const userA = await signup(page, uniqueEmail('members-host'))
    const proj = await seedProject(page, userA.accessToken, { name: 'Shared Proj' })

    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    const userB = await signup(pageB, uniqueEmail('members-guest'))

    const inviteRes = await page.request.post(`${apiBase()}/members`, {
      headers: apiHeaders(userA.accessToken),
      data: { project_id: proj.id, user_id: userB.userId, role: 'member' },
    })
    expect(inviteRes.status(), await inviteRes.text()).toBe(201)

    const after = await page.request.get(`${apiBase()}/members?project_id=${proj.id}`, {
      headers: apiHeaders(userA.accessToken),
    })
    const items = (await after.json()) as { user_id: string }[]
    expect(
      items.find((m) => m.user_id === userB.userId),
      'guest in members list',
    ).toBeTruthy()
    await ctxB.close()
  })

  test("Cross-user: B cannot list members of A's project before being added", async ({
    browser,
    page,
  }) => {
    const userA = await signup(page, uniqueEmail('members-iso-host'))
    const proj = await seedProject(page, userA.accessToken, { name: 'Locked Proj' })

    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    const userB = await signup(pageB, uniqueEmail('members-iso-guest'))

    // Without an invite, listing the project's members must NOT leak data
    // about the project — either 200 with zero rows or a 403/404.
    const res = await pageB.request.get(`${apiBase()}/members?project_id=${proj.id}`, {
      headers: apiHeaders(userB.accessToken),
    })
    if (res.status() === 200) {
      const items = (await res.json()) as { user_id: string }[]
      expect(
        items.find((m) => m.user_id === userA.userId),
        'no host leak',
      ).toBeUndefined()
    } else {
      expect([403, 404]).toContain(res.status())
    }
    await ctxB.close()
  })
})
