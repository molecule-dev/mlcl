/**
 * First-time seed invariant — a fresh signup must get a real, persistent
 * onboarding (10 tasks, 4 milestones, 8 teammates, 5 training modules,
 * 6 documents, 5 notifications) on the first list-endpoint hit.
 *
 * If this regresses, the dashboard / checklist / training / docs pages
 * all render empty for new users — the bug that prompted the seed in
 * the first place.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  authHeaders,
  getMe,
  listDocuments,
  listNotifications,
  listTasks,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('first-time onboarding seed', () => {
  test('a new user has tasks/milestones/team/training/docs/notifications', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('seed'))
    expect(accessToken, 'signup must return an accessToken').toBeTruthy()

    const me = await getMe(page, accessToken)
    expect(me.onboarding.id).toBeTruthy()
    expect(me.counts.totalTasks).toBeGreaterThanOrEqual(8)
    expect(me.counts.totalMilestones).toBeGreaterThanOrEqual(3)
    expect(me.derived.dayNumber).toBeGreaterThan(0)
    expect(me.derived.dayNumber).toBeLessThanOrEqual(90)

    const tasks = await listTasks(page, accessToken)
    expect(tasks.length).toBeGreaterThanOrEqual(8)

    const docs = await listDocuments(page, accessToken)
    expect(docs.length).toBeGreaterThanOrEqual(4)
    expect(docs.some((d) => d.requires_signature)).toBe(true)

    const notifs = await listNotifications(page, accessToken)
    expect(notifs.length).toBeGreaterThanOrEqual(3)

    const teamRes = await page.request.get(`${API_BASE}/team-members`, {
      headers: authHeaders(accessToken),
    })
    const team = (await teamRes.json()) as Array<{
      id: string
      name: string
      department?: string | null
    }>
    expect(team.length).toBeGreaterThanOrEqual(5)

    const modulesRes = await page.request.get(`${API_BASE}/training-modules`, {
      headers: authHeaders(accessToken),
    })
    const modules = (await modulesRes.json()) as Array<{ id: string; title: string }>
    expect(modules.length).toBeGreaterThanOrEqual(3)
  })

  test('seed is idempotent — calling /me twice does NOT create duplicates', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('seed-idem'))

    const first = await getMe(page, accessToken)
    const firstTasks = await listTasks(page, accessToken)
    const firstMilestones = first.counts.totalMilestones

    // Second call should return the same onboarding row, not create a new
    // batch of tasks/milestones.
    const second = await getMe(page, accessToken)
    const secondTasks = await listTasks(page, accessToken)

    expect(second.onboarding.id).toBe(first.onboarding.id)
    expect(secondTasks.length).toBe(firstTasks.length)
    expect(second.counts.totalMilestones).toBe(firstMilestones)
  })

  test('two different users get independent onboardings', async ({ page }) => {
    const a = await signup(page, uniqueEmail('seed-a'))
    const aMe = await getMe(page, a.accessToken)
    await page.evaluate(() => window.localStorage.clear())

    const b = await signup(page, uniqueEmail('seed-b'))
    const bMe = await getMe(page, b.accessToken)

    expect(bMe.onboarding.id).not.toBe(aMe.onboarding.id)
    expect(bMe.user.id).not.toBe(aMe.user.id)
  })
})
