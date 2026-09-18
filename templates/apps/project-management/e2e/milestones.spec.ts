/**
 * Milestones API — backend invariants for /api/milestones used by Timeline.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { apiHeaders, seedMilestone, seedProject, signup, uniqueEmail } from './_helpers.js'

const apiBase = () => `http://localhost:${process.env.API_PORT || '4020'}/api`

test.describe('milestones API', () => {
  test('POST /milestones creates a row that GET /milestones returns', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('mile-crud'))
    const project = await seedProject(page, accessToken, { name: 'Milestone Proj' })
    const m = await seedMilestone(page, accessToken, {
      title: 'Round 1 review',
      project_id: project.id,
    })
    const list = await page.request.get(`${apiBase()}/milestones?project_id=${project.id}`, {
      headers: apiHeaders(accessToken),
    })
    const items = (await list.json()) as { id: string; title: string }[]
    expect(items.find((x) => x.id === m.id)).toBeTruthy()
  })

  test('PATCH /milestones/:id updates status', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('mile-patch'))
    const project = await seedProject(page, accessToken, { name: 'Mile Proj' })
    const m = await seedMilestone(page, accessToken, { title: 'Lock spec', project_id: project.id })
    const patch = await page.request.patch(`${apiBase()}/milestones/${m.id}`, {
      headers: apiHeaders(accessToken),
      data: { status: 'completed' },
    })
    expect(patch.status()).toBe(200)
    const fresh = await page.request.get(`${apiBase()}/milestones/${m.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await fresh.json()) as { status: string }
    expect(body.status).toBe('completed')
  })

  test("Cross-user: B cannot create a milestone in A's project", async ({ browser, page }) => {
    const userA = await signup(page, uniqueEmail('mile-iso-a'))
    const project = await seedProject(page, userA.accessToken, { name: 'A-Mile' })

    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    const userB = await signup(pageB, uniqueEmail('mile-iso-b'))
    const res = await pageB.request.post(`${apiBase()}/milestones`, {
      headers: apiHeaders(userB.accessToken),
      data: {
        title: 'Hijack milestone',
        project_id: project.id,
        due_date: new Date(Date.now() + 86400_000).toISOString(),
      },
    })
    expect(res.status(), 'B POST milestone in A project must 404').toBe(404)
    await ctxB.close()
  })
})
