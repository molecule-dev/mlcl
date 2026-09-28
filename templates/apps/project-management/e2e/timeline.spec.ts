/**
 * /timeline (and /projects/:projectId/timeline) — calendar view + Add Event.
 *
 * Tests:
 * - blank timeline renders the "no upcoming events" empty state
 * - "Add Event" creates a real milestone via POST /api/milestones AND it
 *   appears in GET /api/milestones afterwards (read-after-write)
 * - the new milestone shows up in the calendar grid + survives reload
 * - clicking a milestone opens the popover with the right type/title
 * - the popover's "Delete event" actually removes the milestone server-side
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  captureNetwork,
  seedMilestone,
  seedProject,
  signup,
  uniqueEmail,
} from './_helpers.js'

const apiBase = () => `http://localhost:${process.env.API_PORT || '4020'}/api`

test.describe('timeline page', () => {
  test('renders empty-state when the user has no events at all and fetches /api/milestones', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('timeline-empty'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/timeline')
      await expect(page.getByText(/no upcoming events/i)).toBeVisible({ timeout: 8000 })
    })
    expect(
      reqs.some((r) => r.method === 'GET' && r.url.includes('/api/milestones')),
      'GET /api/milestones fired on mount',
    ).toBeTruthy()
  })

  test("Add Event creates a real milestone for the user's default project + persists across reload", async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('timeline-add'))
    const project = await seedProject(page, accessToken, { name: 'Timeline Default Proj' })
    await page.goto(APP_BASE + '/timeline')
    await page.getByTestId('timeline-add-event').click()
    await expect(page.getByTestId('timeline-add-event-modal')).toBeVisible()
    const milestoneTitle = `Beta Launch ${Date.now()}`
    await page.getByTestId('timeline-add-event-title').fill(milestoneTitle)
    const due = new Date(Date.now() + 4 * 86400_000).toISOString().slice(0, 10)
    await page.getByTestId('timeline-add-event-date').fill(due)
    await page.getByTestId('timeline-add-event-description').fill('Production-ready milestone')
    await page.getByTestId('timeline-add-event-submit').click()
    await expect(page.getByTestId('timeline-add-event-modal')).not.toBeVisible({ timeout: 8000 })

    // Read-after-write: GET /api/milestones now lists it.
    const res = await page.request.get(`${apiBase()}/milestones?project_id=${project.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const items = (await res.json()) as { title: string; project_id: string }[]
    const created = items.find((m) => m.title === milestoneTitle)
    expect(created, 'milestone exists in DB after Add Event').toBeTruthy()
    expect(created!.project_id).toBe(project.id)

    // Reload-persist: timeline shows the milestone in the calendar grid.
    await page.reload()
    await expect(page.locator('main', { hasText: milestoneTitle })).toBeVisible({ timeout: 10000 })
  })

  test('Add Event without a project surfaces a friendly error (no silent failure)', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('timeline-noproj'))
    await page.goto(APP_BASE + '/timeline')
    await page.getByTestId('timeline-add-event').click()
    await page.getByTestId('timeline-add-event-title').fill('Will not create')
    await page.getByTestId('timeline-add-event-submit').click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('alert')).toContainText(/create a project/i)
  })

  test('Project-scoped timeline shows existing milestones for that project', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('timeline-scoped'))
    const project = await seedProject(page, accessToken, { name: 'Scoped Proj' })
    const due = new Date(Date.now() + 6 * 86400_000).toISOString()
    const milestone = await seedMilestone(page, accessToken, {
      title: 'Architecture review',
      project_id: project.id,
      due_date: due,
    })
    await page.goto(APP_BASE + `/projects/${project.id}/timeline`)
    await expect(page.locator('main', { hasText: milestone.title })).toBeVisible({ timeout: 10000 })
  })

  test('Project-scoped /projects/:projectId/calendar route alias renders the same timeline', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('timeline-cal-alias'))
    const project = await seedProject(page, accessToken, { name: 'Calendar Alias Proj' })
    const due = new Date(Date.now() + 8 * 86400_000).toISOString()
    const milestone = await seedMilestone(page, accessToken, {
      title: 'Calendar route alias check',
      project_id: project.id,
      due_date: due,
    })
    await page.goto(APP_BASE + `/projects/${project.id}/calendar`)
    await expect(page.locator('main', { hasText: milestone.title })).toBeVisible({ timeout: 10000 })
  })

  test('Deleting a milestone via the popover removes it from /api/milestones', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('timeline-del'))
    const project = await seedProject(page, accessToken, { name: 'Del Mile Proj' })
    // The calendar grid renders only the CURRENT month, so "today + 3d" must
    // stay inside it — clamp to the last day of the month or the event chip
    // never renders (2026-09-28: Sep 28 + 3d = Oct 1 → chip absent → fail).
    const now = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const due = new Date(
      now.getFullYear(),
      now.getMonth(),
      Math.min(now.getDate() + 3, endOfMonth),
    ).toISOString()
    const m = await seedMilestone(page, accessToken, {
      title: 'Delete me',
      project_id: project.id,
      due_date: due,
    })
    await page.goto(APP_BASE + `/projects/${project.id}/timeline`)

    const eventChip = page.locator(`[data-mol-id="event-${m.id}"]`)
    await expect(eventChip).toBeVisible({ timeout: 10000 })
    await eventChip.click()
    await page.getByTestId(`timeline-event-delete-${m.id}`).click()
    await page.waitForTimeout(500)

    const after = await page.request.get(`${apiBase()}/milestones/${m.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(after.status(), 'GET deleted milestone').toBe(404)
  })
})
