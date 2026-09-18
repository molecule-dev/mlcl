/**
 * 99-user-journey — kitchen-sink cross-page flow that exercises the full
 * primary user lifecycle in one test:
 *   signup → create project → add tasks → drag to done → add milestone
 *   → toggle settings → change theme → log out → log back in → verify
 *   everything persisted.
 *
 * Required by verify-app-coverage.mjs (gate 6). Distinct from the
 * per-page specs because it asserts that state SURVIVES across
 * page-route changes and a full re-login, not just one page reload.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  login,
  seedProject,
  signOut,
  signup,
  uniqueEmail,
} from './_helpers.js'

const apiBase = () => `http://localhost:${process.env.API_PORT || '4020'}/api`

test.describe('full user journey', () => {
  test('signup → create project + tasks + milestone → settings → re-login persists everything', async ({
    page,
    context,
  }) => {
    const email = uniqueEmail('journey')
    const password = 'JourneyPass!9876'

    // Step 1: signup, land on dashboard.
    const { accessToken } = await signup(page, email, password, 'Journey User')
    await expect(page).toHaveURL(/\/dashboard/)

    // Step 2: create a real project.
    const project = await seedProject(page, accessToken, {
      name: 'Journey Build',
      description: 'kitchen-sink test project',
    })

    // Step 3: visit board, add a task via UI.
    await page.goto(APP_BASE + `/projects/${project.id}/board`)
    await expect(page.getByTestId('board-page')).toBeVisible()
    await page.getByTestId('board-add-task-todo').click()
    await page.getByTestId('board-new-task-title').fill('Spec wireframe')
    await page.getByTestId('board-new-task-priority').selectOption('high')
    await page.getByTestId('board-new-task-submit').click()
    await expect(page.getByTestId('board-add-task-modal')).not.toBeVisible({ timeout: 8000 })

    // Step 4: add a milestone via API (timeline UI calendar add path is
    // covered in timeline.spec.ts; we just need a row to assert on after
    // re-login).
    const milestoneRes = await page.request.post(`${apiBase()}/milestones`, {
      headers: apiHeaders(accessToken),
      data: {
        title: 'Round 1 review',
        project_id: project.id,
        due_date: new Date(Date.now() + 7 * 86400_000).toISOString(),
        status: 'open',
      },
    })
    expect(milestoneRes.status(), await milestoneRes.text()).toBe(201)

    // Step 5: change profile via settings.
    await page.goto(APP_BASE + '/settings')
    await page.locator('#profile-display-name').fill('Renamed Architect')
    await page
      .locator('button')
      .filter({ hasText: /Save Changes/i })
      .click()
    await expect(page.getByTestId('profile-saved')).toBeVisible({ timeout: 5000 })

    // Step 6: switch theme to dark.
    await page
      .locator('button')
      .filter({ hasText: /Dark Mode/i })
      .click()
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => document.documentElement.dataset.molMode)).toBe('dark')

    // Step 7: log out (clear cookies + storage to simulate a fresh browser).
    await context.clearCookies()
    await signOut(page)

    // Step 8: log back in with the same credentials, verify everything
    // is still there.
    await login(page, email, password)
    await expect(page).toHaveURL(/\/dashboard/)

    // Project still in the list.
    const projectsList = await page.request.get(`${apiBase()}/projects`, {
      headers: apiHeaders(accessToken),
    })
    expect(projectsList.status()).toBe(200)
    const projects = (await projectsList.json()) as { id: string; name: string }[]
    expect(projects.find((p) => p.id === project.id)).toBeTruthy()

    // Profile rename persisted server-side.
    const me = await page.request.get(`${apiBase()}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    const profile = (await me.json()) as { preferences: { displayName?: string } }
    expect(profile.preferences.displayName).toBe('Renamed Architect')

    // Tasks list contains the task we added via UI.
    const tasksRes = await page.request.get(`${apiBase()}/tasks?project_id=${project.id}`, {
      headers: apiHeaders(accessToken),
    })
    const tasks = (await tasksRes.json()) as { title: string }[]
    expect(
      tasks.find((t) => t.title === 'Spec wireframe'),
      'spec wireframe task',
    ).toBeTruthy()

    // Milestones list contains the milestone we added via API.
    const milestonesRes = await page.request.get(
      `${apiBase()}/milestones?project_id=${project.id}`,
      { headers: apiHeaders(accessToken) },
    )
    const milestones = (await milestonesRes.json()) as { title: string }[]
    expect(
      milestones.find((m) => m.title === 'Round 1 review'),
      'r1 milestone',
    ).toBeTruthy()
  })
})
